import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/schemas/user.schema';
import { GoogleAuthDto } from './dto/google-auth.dto';
export declare class AuthService {
    private usersService;
    private jwtService;
    private configService;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService);
    validateUser(email: string, password: string): Promise<any>;
    login(loginDto: LoginDto): Promise<{
        user: {
            id: any;
            name: any;
            email: any;
            avatar: any;
        };
        accessToken: string;
    }>;
    googleAuth(googleAuthDto: GoogleAuthDto): Promise<{
        user: {
            id: any;
            name: string;
            email: string;
            avatar: string;
        };
        accessToken: string;
    }>;
    register(createUserDto: CreateUserDto): Promise<{
        user: {
            id: any;
            name: string;
            email: string;
            avatar: string;
        };
        accessToken: string;
    }>;
    logoutUser(userId: string): Promise<void>;
    getUserFromToken(token: string): Promise<User>;
}
