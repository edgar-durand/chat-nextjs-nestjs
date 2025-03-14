import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { Room } from './schemas/room.schema';
export declare class RoomsController {
    private readonly roomsService;
    constructor(roomsService: RoomsService);
    create(createRoomDto: CreateRoomDto, req: any): Promise<Room>;
    findAll(): Promise<Room[]>;
    findUserRooms(req: any): Promise<Room[]>;
    findOne(id: string): Promise<Room>;
    addMember(id: string, userId: string): Promise<Room>;
    removeMember(id: string, userId: string): Promise<Room>;
}
