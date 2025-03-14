import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async create(createMessageDto: CreateMessageDto, sender: User): Promise<Message> {
    const newMessage = new this.messageModel({
      content: createMessageDto.content,
      sender: sender._id,
      ...(createMessageDto.recipientId && { recipient: createMessageDto.recipientId }),
      ...(createMessageDto.roomId && { room: createMessageDto.roomId }),
    });

    return newMessage.save();
  }

  async findDirectMessages(userId: string, recipientId: string): Promise<Message[]> {
    return this.messageModel.find({
      $or: [
        { sender: userId, recipient: recipientId },
        { sender: recipientId, recipient: userId },
      ],
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name email avatar')
    .exec();
  }

  async findRoomMessages(roomId: string): Promise<Message[]> {
    return this.messageModel.find({ room: roomId })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email avatar')
      .exec();
  }

  async markAsRead(messageId: string): Promise<Message> {
    const message = await this.messageModel.findByIdAndUpdate(
      messageId,
      { isRead: true },
      { new: true },
    ).exec();

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    return message;
  }

  async getUserUnreadCount(userId: string): Promise<number> {
    return this.messageModel.countDocuments({
      recipient: userId,
      isRead: false,
    }).exec();
  }
}
