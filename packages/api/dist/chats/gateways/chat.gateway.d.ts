import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatsService } from '../chats.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { Model } from 'mongoose';
import { Room } from '../../rooms/schemas/room.schema';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatsService;
    private readonly authService;
    private readonly usersService;
    private readonly roomModel;
    server: Server;
    private userSocketMap;
    constructor(chatsService: ChatsService, authService: AuthService, usersService: UsersService, roomModel: Model<Room>);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handleJoinRoom(client: Socket, data: {
        roomId: string;
    }): {
        success: boolean;
    };
    handleLeaveRoom(client: Socket, data: {
        roomId: string;
    }): {
        success: boolean;
    };
    handleMessage(client: Socket, createMessageDto: CreateMessageDto): Promise<{
        success: boolean;
        messageId: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        messageId?: undefined;
    }>;
    handleTyping(client: Socket, data: {
        recipientId?: string;
        roomId?: string;
        isTyping: boolean;
    }): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    handleMarkRead(client: Socket, data: {
        messageId: string;
    }): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    handleGetUnreadMessages(client: Socket): Promise<{
        success: boolean;
        unreadCounts: Record<string, number>;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        unreadCounts?: undefined;
    }>;
    handleMarkMessagesRead(client: Socket, data: {
        chatId: string;
        chatType: 'private' | 'room';
    }): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
}
