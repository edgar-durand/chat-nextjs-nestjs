import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from '../users/schemas/user.schema';
export declare class ChatsService {
    private messageModel;
    constructor(messageModel: Model<MessageDocument>);
    create(createMessageDto: CreateMessageDto, sender: User): Promise<Message>;
    findDirectMessages(userId: string, recipientId: string): Promise<Message[]>;
    findRoomMessages(roomId: string): Promise<Message[]>;
    markAsRead(messageId: string): Promise<Message>;
    getUserUnreadCount(userId: string): Promise<number>;
}
