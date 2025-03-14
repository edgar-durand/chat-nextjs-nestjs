import { Model } from 'mongoose';
import { Room, RoomDocument } from './schemas/room.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { User } from '../users/schemas/user.schema';
import { Server } from 'socket.io';
export declare class RoomsService {
    private roomModel;
    server: Server;
    constructor(roomModel: Model<RoomDocument>);
    create(createRoomDto: CreateRoomDto, creator: User): Promise<Room>;
    update(id: string, updateRoomDto: UpdateRoomDto, user: User): Promise<Room>;
    findAll(): Promise<Room[]>;
    findOne(id: string): Promise<Room>;
    findUserRooms(userId: string): Promise<Room[]>;
    addMember(roomId: string, userId: string): Promise<Room>;
    removeMember(roomId: string, userId: string): Promise<Room>;
}
