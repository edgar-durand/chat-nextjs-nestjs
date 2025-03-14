import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        user: {
            id: any;
            name: any;
            email: any;
            avatar: any;
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
    googleAuth(googleAuthDto: GoogleAuthDto): Promise<{
        user: {
            id: any;
            name: string;
            email: string;
            avatar: string;
        };
        accessToken: string;
    }>;
    logout(req: any): Promise<{
        message: string;
    }>;
    getProfile(req: any): any;
}
