import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/schemas/user.schema';
import { GoogleAuthDto } from './dto/google-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await user.comparePassword(password)) {
      // Update user online status
      await this.usersService.updateOnlineStatus(user._id, true);
      return user;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const payload = { email: user.email, sub: user._id };
    
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }

  async googleAuth(googleAuthDto: GoogleAuthDto) {
    try {
      // Check if user already exists
      let user = await this.usersService.findByEmail(googleAuthDto.email);
      
      if (!user) {
        // Create new user if doesn't exist
        const newUser = await this.usersService.create({
          name: googleAuthDto.name,
          email: googleAuthDto.email,
          password: Math.random().toString(36).slice(-10), // Random password
          avatar: googleAuthDto.avatar || '',
        });
        
        user = newUser;
      } else {
        // Solo actualizamos el avatar si es que viene uno en la autenticación de Google
        // y el usuario no tiene ya un avatar personalizado
        const updateData: any = {
          // Conservamos el nombre existente para no perder personalización
          name: user.name || googleAuthDto.name,
        };
        
        // Solo actualizar el avatar si el usuario no tiene uno o si viene uno de Google
        if ((!user.avatar || user.avatar === '') && googleAuthDto.avatar) {
          updateData.avatar = googleAuthDto.avatar;
        }
        
        // Actualizar información del usuario existente conservando sus datos actuales
        await this.usersService.updateProfile(user._id, updateData);
        
        // Obtener usuario actualizado
        user = await this.usersService.findOne(user._id);
      }
      
      // Set user as online
      await this.usersService.updateOnlineStatus(user._id, true);
      
      // Generate JWT token
      const payload = { email: user.email, sub: user._id };
      
      return {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
        accessToken: this.jwtService.sign(payload),
      };
    } catch (error) {
      console.error('Google auth error:', error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(createUserDto.email);
    
    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    const user = await this.usersService.create(createUserDto);
    
    const payload = { email: user.email, sub: user._id };
    
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      accessToken: this.jwtService.sign(payload),
    };
  }

  async logoutUser(userId: string): Promise<void> {
    await this.usersService.updateOnlineStatus(userId, false);
  }

  async getUserFromToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      return this.usersService.findOne(payload.sub);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
