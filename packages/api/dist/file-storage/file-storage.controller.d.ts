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
    getFile(fileId: string, res: Response): Promise<void>;
    listFiles(): Promise<{
        success: boolean;
        files: import("./file-storage.service").FileStorageDto[];
    }>;
    deleteFile(fileId: string): Promise<{
        success: boolean;
    }>;
}
