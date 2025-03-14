import { Model } from 'mongoose';
import { FileStorageDocument } from './schemas/file-storage.schema';
export interface FileChunk {
    filename: string;
    chunkIndex: number;
    totalChunks: number;
    chunkData: Buffer;
    contentType: string;
    originalFilename: string;
    size: number;
}
export interface FileStorageDto {
    fileId: string;
    filename: string;
    contentType: string;
    size: number;
    createdAt: Date;
}
export declare class FileStorageService {
    private fileStorageModel;
    private readonly filesDir;
    constructor(fileStorageModel: Model<FileStorageDocument>);
    initializeFile(data: {
        originalFilename: string;
        contentType: string;
        size: number;
        totalChunks: number;
        chunkSize: number;
    }): Promise<string>;
    addChunk(data: FileChunk): Promise<boolean>;
    private determineMediaType;
    private determineFileType;
    uploadCompleteFile(buffer: Buffer, metadata: {
        originalFilename: string;
        contentType: string;
        size: number;
    }): Promise<string>;
    getFile(fileId: string): Promise<{
        file: FileStorageDocument;
        data: Buffer;
    }>;
    getFileByName(filename: string): Promise<FileStorageDocument>;
    getFileMetadata(fileId: string): Promise<{
        contentType: string;
        mediaType: string;
        fileType: string;
        size: number;
        filename: string;
        complete: boolean;
    }>;
    listFiles(): Promise<FileStorageDto[]>;
    deleteFile(fileId: string): Promise<boolean>;
}
