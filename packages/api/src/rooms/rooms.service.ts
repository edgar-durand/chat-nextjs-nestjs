import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument } from './schemas/room.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { User } from '../users/schemas/user.schema';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class RoomsService {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
  ) {}

  async create(createRoomDto: CreateRoomDto, creator: User): Promise<Room> {
    const newRoom = new this.roomModel({
      ...createRoomDto,
      creator: creator._id,
      members: [...(createRoomDto.members || []), creator._id],
    });

    const savedRoom = await newRoom.save();
    
    // Populate creator and members information for the response
    const populatedRoom = await this.roomModel.findById(savedRoom._id)
      .populate('creator', 'name email avatar')
      .populate('members', 'name email avatar isOnline lastActive')
      .exec();
    
    // Notify all members about the new room
    if (populatedRoom.members && populatedRoom.members.length > 0) {
      populatedRoom.members.forEach(member => {
        if (member._id.toString() !== creator._id.toString()) {
          this.server.to(`user_${member._id}`).emit('new_room', populatedRoom);
        }
      });
    }

    return populatedRoom;
  }

  async update(id: string, updateRoomDto: UpdateRoomDto, user: User): Promise<Room> {
    // First check if room exists and user is the creator or has permission
    const room = await this.roomModel.findById(id).exec();
    
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    // Only the creator can update the room
    if (room.creator.toString() !== user._id.toString()) {
      throw new ForbiddenException('You do not have permission to update this room');
    }

    // Update the room
    const updatedRoom = await this.roomModel.findByIdAndUpdate(
      id,
      { ...updateRoomDto },
      { new: true },
    )
      .populate('creator', 'name email avatar')
      .populate('members', 'name email avatar isOnline lastActive')
      .exec();

    // Notify all members about the room update
    updatedRoom.members.forEach(member => {
      this.server.to(`user_${member._id}`).emit('room_updated', updatedRoom);
    });

    return updatedRoom;
  }

  async findAll(): Promise<Room[]> {
    return this.roomModel.find()
      .populate('creator', 'name email avatar')
      .populate('members', 'name email avatar isOnline lastActive')
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
      .populate('members', 'name email avatar isOnline lastActive')
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

    // Notify the added user about being added to the room
    this.server.to(`user_${userId}`).emit('room_updated', room);
    
    // Notify all existing members that a new user has been added
    room.members.forEach(member => {
      if (member._id.toString() !== userId) {
        this.server.to(`user_${member._id}`).emit('room_updated', room);
      }
    });

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

    // Notify the removed user about being removed from the room
    this.server.to(`user_${userId}`).emit('room_updated', {
      ...room.toObject(),
      removed: true
    });
    
    // Notify all remaining members that a user has been removed
    room.members.forEach(member => {
      this.server.to(`user_${member._id}`).emit('room_updated', room);
    });

    return room;
  }
}
