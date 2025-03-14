import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Message } from './schemas/message.schema';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  create(@Body() createMessageDto: CreateMessageDto, @Request() req): Promise<Message> {
    return this.chatsService.create(createMessageDto, req.user);
  }

  @Get('direct/:recipientId')
  findDirectMessages(@Param('recipientId') recipientId: string, @Request() req): Promise<Message[]> {
    return this.chatsService.findDirectMessages(req.user._id, recipientId);
  }

  @Get('room/:roomId')
  findRoomMessages(@Param('roomId') roomId: string): Promise<Message[]> {
    return this.chatsService.findRoomMessages(roomId);
  }

  @Post(':id/read')
  markAsRead(@Param('id') id: string): Promise<Message> {
    return this.chatsService.markAsRead(id);
  }

  @Get('unread')
  getUnreadCount(@Request() req): Promise<{ count: number }> {
    return this.chatsService.getUserUnreadCount(req.user._id)
      .then(count => ({ count }));
  }
}
