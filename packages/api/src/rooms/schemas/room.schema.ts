import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true })
export class Room extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 'https://via.placeholder.com/150?text=Room' })
  image: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  creator: User;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  members: User[];

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
