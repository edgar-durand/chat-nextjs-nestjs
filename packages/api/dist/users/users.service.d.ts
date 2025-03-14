import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private userModel;
    private roomModel;
    constructor(userModel: Model<UserDocument>, roomModel: Model<any>);
    create(createUserDto: CreateUserDto): Promise<User>;
    findAll(): Promise<User[]>;
    findOne(id: string): Promise<User>;
    findByEmail(email: string): Promise<UserDocument | null>;
    updateOnlineStatus(id: string, isOnline: boolean): Promise<User>;
    updateProfile(userId: string, updateUserDto: UpdateUserDto): Promise<User>;
    isRoomMember(userId: string, roomId: string): Promise<boolean>;
    incrementUnreadMessage(userId: string, chatKey: string): Promise<void>;
    getUnreadMessages(userId: string): Promise<Record<string, number>>;
    markMessagesAsRead(userId: string, chatKey: string): Promise<void>;
}
