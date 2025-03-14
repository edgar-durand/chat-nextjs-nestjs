import { Response } from 'express';
import { FileStorageService, FileChunk } from './file-storage.service';
export declare class FileStorageController {
    private readonly fileStorageService;
    constructor(fileStorageService: FileStorageService);
    initializeFile(fileData: {
        originalFilename: string;
        contentType: string;
        size: number;
        totalChunks: number;
        chunkSize: number;
    }): Promise<{
        success: boolean;
        fileId: string;
        filename: string;
    }>;
    uploadChunk(chunkData: FileChunk): Promise<{
        success: boolean;
        complete: boolean;
    }>;
    uploadFile(file: Express.Multer.File, metadata: {
        contentType: string;
    }): Promise<{
        success: boolean;
        fileId: string;
        filename: string;
        size: number;
        contentType: string;
    }>;
    getFile(fileId: string, res: Response): Promise<void>;
    listFiles(): Promise<{
        success: boolean;
        files: import("./file-storage.service").FileStorageDto[];
    }>;
    deleteFile(fileId: string): Promise<{
        success: boolean;
    }>;
}
