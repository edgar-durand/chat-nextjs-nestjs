import { ChatsService } from './chats.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message } from './schemas/message.schema';
export declare class ChatsController {
    private readonly chatsService;
    constructor(chatsService: ChatsService);
    create(createMessageDto: CreateMessageDto, req: any): Promise<Message>;
    findDirectMessages(recipientId: string, req: any): Promise<Message[]>;
    findRoomMessages(roomId: string): Promise<Message[]>;
    markAsRead(id: string): Promise<Message>;
    getUnreadCount(req: any): Promise<{
        count: number;
    }>;
}
