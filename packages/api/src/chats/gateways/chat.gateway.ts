import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { ChatsService } from '../chats.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { WsJwtAuthGuard } from '../../auth/guards/ws-jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap: Map<string, string> = new Map();

  constructor(
    private readonly chatsService: ChatsService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        client.disconnect();
        return;
      }

      const user = await this.authService.getUserFromToken(token);
      
      if (!user) {
        client.disconnect();
        return;
      }

      // Store the socket id with user id for direct messaging
      this.userSocketMap.set(user._id.toString(), client.id);
      
      // Join user to their own room for direct messages
      client.join(`user_${user._id}`);
      
      // Set user as online
      await this.usersService.updateOnlineStatus(user._id, true);
      
      // Broadcast user online status
      this.server.emit('user_status_change', {
        userId: user._id,
        isOnline: true,
      });
      
    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return;
      }

      const user = await this.authService.getUserFromToken(token);
      
      if (!user) {
        return;
      }

      // Remove user from socket map
      this.userSocketMap.delete(user._id.toString());
      
      // Set user as offline
      await this.usersService.updateOnlineStatus(user._id, false);
      
      // Broadcast user offline status
      this.server.emit('user_status_change', {
        userId: user._id,
        isOnline: false,
      });
    } catch (error) {
      // Silent fail
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    client.join(`room_${data.roomId}`);
    return { success: true };
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    client.leave(`room_${data.roomId}`);
    return { success: true };
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() createMessageDto: CreateMessageDto,
  ) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      const user = await this.authService.getUserFromToken(token);
      
      if (!user) {
        return { success: false, error: 'Unauthorized' };
      }

      const message = await this.chatsService.create(createMessageDto, user);
      
      // Populate the sender info
      const populatedMessage = {
        ...message.toJSON(),
        sender: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
      };

      // If it's a room message
      if (createMessageDto.roomId) {
        this.server.to(`room_${createMessageDto.roomId}`).emit('new_message', populatedMessage);
      } 
      // If it's a direct message
      else if (createMessageDto.recipientId) {
        // Send to recipient
        this.server.to(`user_${createMessageDto.recipientId}`).emit('new_message', populatedMessage);
        // Send to sender (if they're not the same)
        if (user._id.toString() !== createMessageDto.recipientId) {
          this.server.to(`user_${user._id}`).emit('new_message', populatedMessage);
        }
      }

      return { success: true, message: populatedMessage };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { recipientId?: string; roomId?: string; isTyping: boolean },
  ) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      const user = await this.authService.getUserFromToken(token);
      
      if (!user) {
        return { success: false, error: 'Unauthorized' };
      }

      const typingData = {
        userId: user._id,
        userName: user.name,
        isTyping: data.isTyping,
      };

      // If it's a room message
      if (data.roomId) {
        this.server.to(`room_${data.roomId}`).emit('typing_indicator', {
          ...typingData,
          roomId: data.roomId,
        });
      } 
      // If it's a direct message
      else if (data.recipientId) {
        this.server.to(`user_${data.recipientId}`).emit('typing_indicator', {
          ...typingData,
          senderId: user._id,
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string },
  ) {
    try {
      await this.chatsService.markAsRead(data.messageId);
      
      // Notify clients about read messages
      this.server.emit('message_read', { messageId: data.messageId });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
