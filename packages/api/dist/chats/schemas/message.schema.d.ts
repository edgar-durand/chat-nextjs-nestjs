import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Room } from '../../rooms/schemas/room.schema';
export type MessageDocument = Message & Document;
export declare class Message extends Document {
    sender: User;
    content: string;
    recipient?: User;
    room?: Room;
    isRead: boolean;
    createdAt: Date;
}
export declare const MessageSchema: MongooseSchema<Message, import("mongoose").Model<Message, any, any, any, Document<unknown, any, Message> & Message & {
    _id: import("mongoose").Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Message, Document<unknown, {}, import("mongoose").FlatRecord<Message>> & import("mongoose").FlatRecord<Message> & {
    _id: import("mongoose").Types.ObjectId;
}>;
