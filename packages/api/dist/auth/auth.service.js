"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const users_service_1 = require("../users/users.service");
let AuthService = class AuthService {
    constructor(usersService, jwtService, configService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async validateUser(email, password) {
        const user = await this.usersService.findByEmail(email);
        if (user && await user.comparePassword(password)) {
            await this.usersService.updateOnlineStatus(user._id, true);
            return user;
        }
        return null;
    }
    async login(loginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
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
    async register(createUserDto) {
        const existingUser = await this.usersService.findByEmail(createUserDto.email);
        if (existingUser) {
            throw new common_1.UnauthorizedException('Email already exists');
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
    async logoutUser(userId) {
        await this.usersService.updateOnlineStatus(userId, false);
    }
    async getUserFromToken(token) {
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET'),
            });
            return this.usersService.findOne(payload.sub);
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map