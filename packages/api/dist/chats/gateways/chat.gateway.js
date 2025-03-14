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
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const room_schema_1 = require("../../rooms/schemas/room.schema");
let ChatGateway = class ChatGateway {
    constructor(chatsService, authService, usersService, roomModel) {
        this.chatsService = chatsService;
        this.authService = authService;
        this.usersService = usersService;
        this.roomModel = roomModel;
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
                }, deletedFor: message.deletedFor || [] });
            if (createMessageDto.roomId) {
                this.server.to(`room_${createMessageDto.roomId}`).emit('new_message', populatedMessage);
                const users = await this.usersService.findAll();
                const room = await this.roomModel.findById(createMessageDto.roomId).exec();
                if (room) {
                    for (const memberId of room.members) {
                        if (memberId.toString() !== user._id.toString()) {
                            await this.usersService.incrementUnreadMessage(memberId.toString(), `room_${createMessageDto.roomId}`);
                            const onlineUser = users.find(u => u._id.toString() === memberId.toString() && u.isOnline);
                            if (onlineUser) {
                                const socketId = this.userSocketMap.get(memberId.toString());
                                if (socketId) {
                                    const unreadCounts = await this.usersService.getUnreadMessages(memberId.toString());
                                    this.server.to(socketId).emit('unread_messages_count', unreadCounts);
                                }
                            }
                        }
                    }
                }
            }
            else if (createMessageDto.recipientId) {
                const recipientSocketId = this.userSocketMap.get(createMessageDto.recipientId);
                client.emit('new_message', populatedMessage);
                if (recipientSocketId) {
                    console.log(`Enviando mensaje al destinatario con socket ID: ${recipientSocketId}`);
                    this.server.to(recipientSocketId).emit('new_message', populatedMessage);
                }
                await this.usersService.incrementUnreadMessage(createMessageDto.recipientId, `user_${user._id}`);
                if (recipientSocketId) {
                    const unreadCounts = await this.usersService.getUnreadMessages(createMessageDto.recipientId);
                    this.server.to(recipientSocketId).emit('unread_messages_count', unreadCounts);
                }
            }
            return { success: true, messageId: message._id };
        }
        catch (error) {
            console.error('Error handling message:', error);
            return {
                success: false,
                error: error.message || 'Error al procesar el mensaje'
            };
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
        maxHttpBufferSize: 25 * 1024 * 1024,
    }),
    __param(3, (0, mongoose_1.InjectModel)(room_schema_1.Room.name)),
    __metadata("design:paramtypes", [chats_service_1.ChatsService,
        auth_service_1.AuthService,
        users_service_1.UsersService,
        mongoose_2.Model])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map