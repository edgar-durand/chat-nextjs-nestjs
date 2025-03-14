import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
export type RoomDocument = Room & Document;
export declare class Room extends Document {
    name: string;
    description: string;
    image: string;
    creator: User;
    members: User[];
    isPrivate: boolean;
    createdAt: Date;
}
export declare const RoomSchema: MongooseSchema<Room, import("mongoose").Model<Room, any, any, any, Document<unknown, any, Room> & Room & {
    _id: import("mongoose").Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Room, Document<unknown, {}, import("mongoose").FlatRecord<Room>> & import("mongoose").FlatRecord<Room> & {
    _id: import("mongoose").Types.ObjectId;
}>;
