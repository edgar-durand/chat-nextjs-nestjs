import { Document } from 'mongoose';
export type FileStorageDocument = FileStorage & Document;
export declare class FileStorage {
    filename: string;
    originalFilename: string;
    contentType: string;
    size: number;
    chunkSize: number;
    totalChunks: number;
    chunks: Buffer[];
    complete: boolean;
    mediaType: string;
    fileType: string;
    thumbnail: string;
    storedInFilesystem: boolean;
    filePath: string;
}
export declare const FileStorageSchema: import("mongoose").Schema<FileStorage, import("mongoose").Model<FileStorage, any, any, any, Document<unknown, any, FileStorage> & FileStorage & {
    _id: import("mongoose").Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, FileStorage, Document<unknown, {}, import("mongoose").FlatRecord<FileStorage>> & import("mongoose").FlatRecord<FileStorage> & {
    _id: import("mongoose").Types.ObjectId;
}>;
