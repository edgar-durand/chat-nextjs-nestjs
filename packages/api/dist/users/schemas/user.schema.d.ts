import { Document } from 'mongoose';
export type UserDocument = User & Document;
export declare class User extends Document {
    name: string;
    email: string;
    password: string;
    avatar: string;
    isOnline: boolean;
    lastActive: Date;
    provider: string;
    providerId: string;
    unreadMessages: Record<string, number>;
    comparePassword: (candidatePassword: string) => Promise<boolean>;
}
export declare const UserSchema: import("mongoose").Schema<User, import("mongoose").Model<User, any, any, any, Document<unknown, any, User> & User & {
    _id: import("mongoose").Types.ObjectId;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, User, Document<unknown, {}, import("mongoose").FlatRecord<User>> & import("mongoose").FlatRecord<User> & {
    _id: import("mongoose").Types.ObjectId;
}>;
