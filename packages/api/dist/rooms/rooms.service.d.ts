import { Model } from 'mongoose';
import { Room, RoomDocument } from './schemas/room.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { User } from '../users/schemas/user.schema';
export declare class RoomsService {
    private roomModel;
    constructor(roomModel: Model<RoomDocument>);
    create(createRoomDto: CreateRoomDto, creator: User): Promise<Room>;
    findAll(): Promise<Room[]>;
    findOne(id: string): Promise<Room>;
    findUserRooms(userId: string): Promise<Room[]>;
    addMember(roomId: string, userId: string): Promise<Room>;
    removeMember(roomId: string, userId: string): Promise<Room>;
}
