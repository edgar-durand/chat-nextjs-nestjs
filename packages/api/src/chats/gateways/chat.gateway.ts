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
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room } from '../../rooms/schemas/room.schema';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  maxHttpBufferSize: 25 * 1024 * 1024, // 25MB
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSocketMap: Map<string, string> = new Map();

  constructor(
    private readonly chatsService: ChatsService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
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
      
      // Send unread messages count to user when they connect
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
        // Aseguramos que el campo deletedFor se envía correctamente
        deletedFor: message.deletedFor || [],
      };

      // If it's a room message
      if (createMessageDto.roomId) {
        // Emit to all room members (already subscribed to the room_X channel)
        this.server.to(`room_${createMessageDto.roomId}`).emit('new_message', populatedMessage);
        
        // Get ALL connected users (their IDs and sockets)
        const users = await this.usersService.findAll();
        
        // Obtener directamente la sala desde el modelo
        const room = await this.roomModel.findById(createMessageDto.roomId).exec();
        
        if (room) {
          // Increase unread count for all room members who are NOT the sender
          for (const memberId of room.members) {
            if (memberId.toString() !== user._id.toString()) {
              await this.usersService.incrementUnreadMessage(memberId.toString(), `room_${createMessageDto.roomId}`);
              
              // Find if this user is online
              const onlineUser = users.find(u => u._id.toString() === memberId.toString() && u.isOnline);
              
              if (onlineUser) {
                // Get the socket ID for this user
                const socketId = this.userSocketMap.get(memberId.toString());
                
                if (socketId) {
                  // Send unread count update to this user
                  const unreadCounts = await this.usersService.getUnreadMessages(memberId.toString());
                  this.server.to(socketId).emit('unread_messages_count', unreadCounts);
                }
              }
            }
          }
        }
      } else if (createMessageDto.recipientId) {
        // It's a direct message
        // Get the recipient's socket ID
        const recipientSocketId = this.userSocketMap.get(createMessageDto.recipientId);
        
        // Emit to sender (acknowledge their message)
        client.emit('new_message', populatedMessage);
        
        // Emit to recipient if they are connected
        if (recipientSocketId) {
          console.log(`Enviando mensaje al destinatario con socket ID: ${recipientSocketId}`);
          this.server.to(recipientSocketId).emit('new_message', populatedMessage);
        }
        
        // Incrementar contador de mensajes no leídos para el destinatario
        await this.usersService.incrementUnreadMessage(createMessageDto.recipientId, `user_${user._id}`);
        
        // Si el destinatario está conectado, enviarle actualización de mensajes no leídos
        if (recipientSocketId) {
          const unreadCounts = await this.usersService.getUnreadMessages(createMessageDto.recipientId);
          this.server.to(recipientSocketId).emit('unread_messages_count', unreadCounts);
        }
      }
      
      // Enviar respuesta de éxito al cliente
      return { success: true, messageId: message._id };
    } catch (error) {
      console.error('Error handling message:', error);
      // Enviar respuesta de error al cliente
      return { 
        success: false, 
        error: error.message || 'Error al procesar el mensaje' 
      };
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
      
      // Get unread messages from database
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
      
      // Build the chat key
      const chatKey = data.chatType === 'private' 
        ? `user_${data.chatId}` 
        : `room_${data.chatId}`;
      
      // Mark messages as read in database
      await this.usersService.markMessagesAsRead(user._id.toString(), chatKey);
      
      // Send update to client
      const unreadCounts = await this.usersService.getUnreadMessages(user._id.toString());
      client.emit('unread_messages_count', unreadCounts);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
