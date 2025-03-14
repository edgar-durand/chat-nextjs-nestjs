import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Room } from '../../rooms/schemas/room.schema';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  sender: User;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  recipient?: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room' })
  room?: Room;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
