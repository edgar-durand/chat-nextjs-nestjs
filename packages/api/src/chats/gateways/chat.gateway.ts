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
      
      // Enviar recuento de mensajes no leídos al usuario cuando se conecta
      const unreadCounts = await this.usersService.getUnreadMessages(user._id.toString());
      client.emit('unread_messages_count', unreadCounts);
      
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
        // Emitir a todos los miembros de la sala (están ya suscritos al canal room_X)
        this.server.to(`room_${createMessageDto.roomId}`).emit('new_message', populatedMessage);
        
        // Obtener TODOS los usuarios conectados (sus IDs y sockets)
        const users = await this.usersService.findAll();
        
        // Para cada usuario, verificar si es miembro de la sala pero no es el remitente
        for (const potentialMember of users) {
          // No enviar notificación al remitente
          if (potentialMember._id.toString() === user._id.toString()) continue;
          
          // Verificar si el usuario es miembro de esta sala específica
          const isMember = await this.usersService.isRoomMember(
            potentialMember._id, 
            createMessageDto.roomId
          );
          
          if (isMember) {
            // Incrementar contador de mensajes no leídos en la base de datos
            await this.usersService.incrementUnreadMessage(
              potentialMember._id.toString(),
              `room_${createMessageDto.roomId}`
            );
            
            // Si el usuario está conectado, enviarle actualización inmediata
            const socketId = this.userSocketMap.get(potentialMember._id.toString());
            if (socketId) {
              const unreadCounts = await this.usersService.getUnreadMessages(potentialMember._id.toString());
              this.server.to(socketId).emit('unread_messages_count', unreadCounts);
            }
          }
        }
      } 
      // If it's a direct message
      else if (createMessageDto.recipientId) {
        // Incrementar el contador de mensajes no leídos en la base de datos
        await this.usersService.incrementUnreadMessage(
          createMessageDto.recipientId,
          `user_${user._id}`
        );
        
        // Si el receptor está conectado, enviarle actualización en tiempo real
        const recipientSocketId = this.userSocketMap.get(createMessageDto.recipientId);
        if (recipientSocketId) {
          const unreadCounts = await this.usersService.getUnreadMessages(createMessageDto.recipientId);
          this.server.to(recipientSocketId).emit('unread_messages_count', unreadCounts);
        }
        
        // Send to recipient
        this.server.to(`user_${createMessageDto.recipientId}`).emit('new_message', populatedMessage);
        // Send to sender (if they're not the same)
        if (user._id.toString() !== createMessageDto.recipientId) {
          this.server.to(`user_${user._id}`).emit('new_message', populatedMessage);
        }
      }

      return { success: true, message: populatedMessage };
    } catch (error) {
      console.error('Error sending message:', error);
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

  // New handler for getting unread messages
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('get_unread_messages')
  async handleGetUnreadMessages(@ConnectedSocket() client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      const user = await this.authService.getUserFromToken(token);
      
      if (!user) {
        return { success: false, error: 'Unauthorized' };
      }
      
      // Obtener mensajes no leídos desde la base de datos
      const unreadCounts = await this.usersService.getUnreadMessages(user._id.toString());
      client.emit('unread_messages_count', unreadCounts);
      return { success: true, unreadCounts };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Mark messages as read
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('mark_messages_read')
  async handleMarkMessagesRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string, chatType: 'private' | 'room' },
  ) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      const user = await this.authService.getUserFromToken(token);
      
      if (!user) {
        return { success: false, error: 'Unauthorized' };
      }
      
      // Construir la clave del chat
      const chatKey = data.chatType === 'private' 
        ? `user_${data.chatId}` 
        : `room_${data.chatId}`;
      
      // Marcar mensajes como leídos en la base de datos
      await this.usersService.markMessagesAsRead(user._id.toString(), chatKey);
      
      // Enviar actualización al cliente
      const unreadCounts = await this.usersService.getUnreadMessages(user._id.toString());
      client.emit('unread_messages_count', unreadCounts);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
