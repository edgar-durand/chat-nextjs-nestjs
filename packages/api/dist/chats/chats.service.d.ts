import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from '../users/schemas/user.schema';
import { FileStorageService } from '../file-storage/file-storage.service';
export declare class ChatsService {
    private messageModel;
    private readonly fileStorageService;
    private readonly INLINE_FILE_SIZE_LIMIT;
    private readonly MAX_FILE_SIZE;
    constructor(messageModel: Model<MessageDocument>, fileStorageService: FileStorageService);
    create(createMessageDto: CreateMessageDto, sender: User): Promise<Message>;
    findDirectMessages(userId: string, recipientId: string): Promise<Message[]>;
    findRoomMessages(roomId: string): Promise<Message[]>;
    markAsRead(messageId: string): Promise<Message>;
    getUserUnreadCount(userId: string): Promise<number>;
    clearDirectMessageHistory(userId: string, recipientId: string): Promise<{
        deletedCount: number;
    }>;
}
