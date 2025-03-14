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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const chats_service_1 = require("../chats.service");
const create_message_dto_1 = require("../dto/create-message.dto");
const auth_service_1 = require("../../auth/auth.service");
const users_service_1 = require("../../users/users.service");
const ws_jwt_auth_guard_1 = require("../../auth/guards/ws-jwt-auth.guard");
let ChatGateway = class ChatGateway {
    constructor(chatsService, authService, usersService) {
        this.chatsService = chatsService;
        this.authService = authService;
        this.usersService = usersService;
        this.userSocketMap = new Map();
    }
    async handleConnection(client) {
        var _a;
        try {
            const token = client.handshake.auth.token || ((_a = client.handshake.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]);
            if (!token) {
                client.disconnect();
                return;
            }
            const user = await this.authService.getUserFromToken(token);
            if (!user) {
                client.disconnect();
                return;
            }
            this.userSocketMap.set(user._id.toString(), client.id);
            client.join(`user_${user._id}`);
            await this.usersService.updateOnlineStatus(user._id, true);
            this.server.emit('user_status_change', {
                userId: user._id,
                isOnline: true,
            });
            const unreadCounts = await this.usersService.getUnreadMessages(user._id.toString());
            client.emit('unread_messages_count', unreadCounts);
        }
        catch (error) {
            client.disconnect();
        }
    }
    async handleDisconnect(client) {
        var _a;
        try {
            const token = client.handshake.auth.token || ((_a = client.handshake.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]);
            if (!token) {
                return;
            }
            const user = await this.authService.getUserFromToken(token);
            if (!user) {
                return;
            }
            this.userSocketMap.delete(user._id.toString());
            await this.usersService.updateOnlineStatus(user._id, false);
            this.server.emit('user_status_change', {
                userId: user._id,
                isOnline: false,
            });
        }
        catch (error) {
        }
    }
    handleJoinRoom(client, data) {
        client.join(`room_${data.roomId}`);
        return { success: true };
    }
    handleLeaveRoom(client, data) {
        client.leave(`room_${data.roomId}`);
        return { success: true };
    }
    async handleMessage(client, createMessageDto) {
        var _a;
        try {
            const token = client.handshake.auth.token || ((_a = client.handshake.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]);
            const user = await this.authService.getUserFromToken(token);
            if (!user) {
                return { success: false, error: 'Unauthorized' };
            }
            const message = await this.chatsService.create(createMessageDto, user);
            const populatedMessage = Object.assign(Object.assign({}, message.toJSON()), { sender: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                } });
            if (createMessageDto.roomId) {
                this.server.to(`room_${createMessageDto.roomId}`).emit('new_message', populatedMessage);
                const users = await this.usersService.findAll();
                for (const potentialMember of users) {
                    if (potentialMember._id.toString() === user._id.toString())
                        continue;
                    const isMember = await this.usersService.isRoomMember(potentialMember._id, createMessageDto.roomId);
                    if (isMember) {
                        await this.usersService.incrementUnreadMessage(potentialMember._id.toString(), `room_${createMessageDto.roomId}`);
                        const socketId = this.userSocketMap.get(potentialMember._id.toString());
                        if (socketId) {
                            const unreadCounts = await this.usersService.getUnreadMessages(potentialMember._id.toString());
                            this.server.to(socketId).emit('unread_messages_count', unreadCounts);
                        }
                    }
                }
            }
            else if (createMessageDto.recipientId) {
                await this.usersService.incrementUnreadMessage(createMessageDto.recipientId, `user_${user._id}`);
                const recipientSocketId = this.userSocketMap.get(createMessageDto.recipientId);
                if (recipientSocketId) {
                    const unreadCounts = await this.usersService.getUnreadMessages(createMessageDto.recipientId);
                    this.server.to(recipientSocketId).emit('unread_messages_count', unreadCounts);
                }
                this.server.to(`user_${createMessageDto.recipientId}`).emit('new_message', populatedMessage);
                if (user._id.toString() !== createMessageDto.recipientId) {
                    this.server.to(`user_${user._id}`).emit('new_message', populatedMessage);
                }
            }
            return { success: true, message: populatedMessage };
        }
        catch (error) {
            console.error('Error sending message:', error);
            return { success: false, error: error.message };
        }
    }
    async handleTyping(client, data) {
        var _a;
        try {
            const token = client.handshake.auth.token || ((_a = client.handshake.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]);
            const user = await this.authService.getUserFromToken(token);
            if (!user) {
                return { success: false, error: 'Unauthorized' };
            }
            const typingData = {
                userId: user._id,
                userName: user.name,
                isTyping: data.isTyping,
            };
            if (data.roomId) {
                this.server.to(`room_${data.roomId}`).emit('typing_indicator', Object.assign(Object.assign({}, typingData), { roomId: data.roomId }));
            }
            else if (data.recipientId) {
                this.server.to(`user_${data.recipientId}`).emit('typing_indicator', Object.assign(Object.assign({}, typingData), { senderId: user._id }));
            }
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async handleMarkRead(client, data) {
        try {
            await this.chatsService.markAsRead(data.messageId);
            this.server.emit('message_read', { messageId: data.messageId });
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async handleGetUnreadMessages(client) {
        var _a;
        try {
            const token = client.handshake.auth.token || ((_a = client.handshake.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]);
            const user = await this.authService.getUserFromToken(token);
            if (!user) {
                return { success: false, error: 'Unauthorized' };
            }
            const unreadCounts = await this.usersService.getUnreadMessages(user._id.toString());
            client.emit('unread_messages_count', unreadCounts);
            return { success: true, unreadCounts };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async handleMarkMessagesRead(client, data) {
        var _a;
        try {
            const token = client.handshake.auth.token || ((_a = client.handshake.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]);
            const user = await this.authService.getUserFromToken(token);
            if (!user) {
                return { success: false, error: 'Unauthorized' };
            }
            const chatKey = data.chatType === 'private'
                ? `user_${data.chatId}`
                : `room_${data.chatId}`;
            await this.usersService.markMessagesAsRead(user._id.toString(), chatKey);
            const unreadCounts = await this.usersService.getUnreadMessages(user._id.toString());
            client.emit('unread_messages_count', unreadCounts);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_auth_guard_1.WsJwtAuthGuard),
    (0, websockets_1.SubscribeMessage)('join_room'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_auth_guard_1.WsJwtAuthGuard),
    (0, websockets_1.SubscribeMessage)('leave_room'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleLeaveRoom", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_auth_guard_1.WsJwtAuthGuard),
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket,
        create_message_dto_1.CreateMessageDto]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessage", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_auth_guard_1.WsJwtAuthGuard),
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTyping", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_auth_guard_1.WsJwtAuthGuard),
    (0, websockets_1.SubscribeMessage)('mark_read'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMarkRead", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_auth_guard_1.WsJwtAuthGuard),
    (0, websockets_1.SubscribeMessage)('get_unread_messages'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleGetUnreadMessages", null);
__decorate([
    (0, common_1.UseGuards)(ws_jwt_auth_guard_1.WsJwtAuthGuard),
    (0, websockets_1.SubscribeMessage)('mark_messages_read'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMarkMessagesRead", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [chats_service_1.ChatsService,
        auth_service_1.AuthService,
        users_service_1.UsersService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map