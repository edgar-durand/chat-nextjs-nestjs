import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Room } from '../../rooms/schemas/room.schema';

export type MessageDocument = Message & Document;

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio'
}

export class FileAttachment {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  contentType: string;

  @Prop({ enum: FileType, required: true })
  fileType: FileType;

  @Prop({ required: false })
  data: string; // Base64 encoded data for small files

  @Prop()
  size: number;
  
  @Prop()
  fileId: string; // Reference to stored large file in FileStorage collection
  
  @Prop({ default: false })
  isLargeFile: boolean; // Flag to indicate if this is a large file stored separately
}

const FileAttachmentSchema = new MongooseSchema({
  filename: { type: String, required: true },
  contentType: { type: String, required: true },
  fileType: { type: String, enum: Object.values(FileType), required: true },
  data: { type: String, required: false },
  size: { type: Number },
  fileId: { type: String },
  isLargeFile: { type: Boolean, default: false }
});

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  sender: User;

  @Prop({ type: String, required: false })
  content: string;

  @Prop({ type: [FileAttachmentSchema], default: [] })
  attachments: FileAttachment[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  recipient?: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room' })
  room?: Room;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] })
  deletedFor: User[]; // IDs de usuarios que han borrado este mensaje de su vista

  @Prop({ default: false })
  deletedForEveryone: boolean; // Indica si el mensaje ha sido eliminado para todos

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
