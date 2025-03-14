import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/schemas/user.schema';

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
