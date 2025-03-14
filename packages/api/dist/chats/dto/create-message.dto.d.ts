import { FileType } from '../schemas/message.schema';
export declare class FileAttachmentDto {
    filename: string;
    contentType: string;
    fileType: FileType;
    data?: string;
    size?: number;
    fileId?: string;
    isLargeFile?: boolean;
}
export declare class CreateMessageDto {
    content?: string;
    attachments?: FileAttachmentDto[];
    recipientId?: string;
    roomId?: string;
}
