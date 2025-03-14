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
exports.WsJwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const auth_service_1 = require("../auth.service");
let WsJwtAuthGuard = class WsJwtAuthGuard {
    constructor(authService) {
        this.authService = authService;
    }
    async canActivate(context) {
        var _a;
        try {
            const client = context.switchToWs().getClient();
            const token = client.handshake.auth.token || ((_a = client.handshake.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]);
            if (!token) {
                throw new websockets_1.WsException('Unauthorized');
            }
            const user = await this.authService.getUserFromToken(token);
            if (!user) {
                throw new websockets_1.WsException('Unauthorized');
            }
            client.user = user;
            return true;
        }
        catch (err) {
            throw new websockets_1.WsException('Unauthorized');
        }
    }
};
exports.WsJwtAuthGuard = WsJwtAuthGuard;
exports.WsJwtAuthGuard = WsJwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], WsJwtAuthGuard);
//# sourceMappingURL=ws-jwt-auth.guard.js.map