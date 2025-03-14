import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FileStorageDocument = FileStorage & Document;

@Schema({ timestamps: true })
export class FileStorage {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalFilename: string;

  @Prop({ required: true })
  contentType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  chunkSize: number;

  @Prop({ required: true })
  totalChunks: number;

  @Prop({ required: true, type: [Buffer] })
  chunks: Buffer[];
  
  @Prop({ default: false })
  complete: boolean;
  
  @Prop({ type: String, enum: ['image', 'video', 'audio', 'document'] })
  mediaType: string;
  
  @Prop()
  fileType: string;
  
  @Prop()
  thumbnail: string;
  
  @Prop({ default: false })
  storedInFilesystem: boolean;
  
  @Prop()
  filePath: string;
}

export const FileStorageSchema = SchemaFactory.createForClass(FileStorage);
