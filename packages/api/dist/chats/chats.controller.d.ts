import { ChatsService } from './chats.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './schemas/message.schema';
import { Response } from 'express';
import { FileStorageService } from '../file-storage/file-storage.service';
export declare class ChatsController {
    private readonly chatsService;
    private readonly fileStorageService;
    constructor(chatsService: ChatsService, fileStorageService: FileStorageService);
    create(createMessageDto: CreateMessageDto, req: any): Promise<Message>;
    findDirectMessages(recipientId: string, req: any): Promise<Message[]>;
    clearDirectMessages(recipientId: string, req: any): Promise<{
        success: boolean;
        message: string;
        deletedCount: number;
    } | {
        success: boolean;
        message: any;
        deletedCount?: undefined;
    }>;
    findRoomMessages(roomId: string): Promise<Message[]>;
    getFile(fileId: string, preview: string, res: Response): Promise<Response<any, Record<string, any>>>;
    getFileThumbnail(fileId: string, res: Response): Promise<Response<any, Record<string, any>>>;
    markAsRead(id: string): Promise<Message>;
    getUnreadCount(req: any): Promise<{
        count: number;
    }>;
}
