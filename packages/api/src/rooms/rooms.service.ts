import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument } from './schemas/room.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
  ) {}

  async create(createRoomDto: CreateRoomDto, creator: User): Promise<Room> {
    const newRoom = new this.roomModel({
      ...createRoomDto,
      creator: creator._id,
      members: [...(createRoomDto.members || []), creator._id],
    });

    return newRoom.save();
  }

  async findAll(): Promise<Room[]> {
    return this.roomModel.find()
      .populate('creator', 'name email avatar')
      .exec();
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomModel.findById(id)
      .populate('creator', 'name email avatar')
      .populate('members', 'name email avatar isOnline lastActive')
      .exec();

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    return room;
  }

  async findUserRooms(userId: string): Promise<Room[]> {
    return this.roomModel.find({ members: userId })
      .populate('creator', 'name email avatar')
      .exec();
  }

  async addMember(roomId: string, userId: string): Promise<Room> {
    const room = await this.roomModel.findByIdAndUpdate(
      roomId,
      { $addToSet: { members: userId } },
      { new: true },
    )
      .populate('creator', 'name email avatar')
      .populate('members', 'name email avatar isOnline lastActive')
      .exec();

    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    return room;
  }

  async removeMember(roomId: string, userId: string): Promise<Room> {
    const room = await this.roomModel.findByIdAndUpdate(
      roomId,
      { $pull: { members: userId } },
      { new: true },
    )
      .populate('creator', 'name email avatar')
      .populate('members', 'name email avatar isOnline lastActive')
      .exec();

    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    return room;
  }
}
