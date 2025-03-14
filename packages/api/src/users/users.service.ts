import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Room } from '../rooms/schemas/room.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Room.name) private roomModel: Model<any>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async updateOnlineStatus(id: string, isOnline: boolean): Promise<User> {
    const updates: any = {
      isOnline,
    };
    
    if (!isOnline) {
      updates.lastActive = new Date();
    }
    
    const user = await this.userModel.findByIdAndUpdate(
      id,
      updates,
      { new: true },
    ).exec();
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Handle password change
    if (updateUserDto.newPassword) {
      // Validate current password if provided
      if (!updateUserDto.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }

      const isPasswordValid = await user.comparePassword(updateUserDto.currentPassword);
      if (!isPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      // Set new password
      user.password = updateUserDto.newPassword;
      
      // Remove password fields from update object
      delete updateUserDto.currentPassword;
      delete updateUserDto.newPassword;
    }

    // Update other fields
    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.avatar) {
      user.avatar = updateUserDto.avatar;
    }

    // Save the updated user
    await user.save();
    
    return user;
  }

  async isRoomMember(userId: string, roomId: string): Promise<boolean> {
    const room = await this.roomModel.findById(roomId).exec();
    if (!room) {
      return false;
    }
    
    return room.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );
  }

  // Incrementar contador de mensajes no leídos para un usuario específico
  async incrementUnreadMessage(userId: string, chatKey: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      return;
    }

    // Crear objeto de unreadMessages si no existe
    if (!user.unreadMessages) {
      user.unreadMessages = {};
    }
    
    // Incrementar contador para este chat
    user.unreadMessages[chatKey] = (user.unreadMessages[chatKey] || 0) + 1;
    
    // Guardar en la base de datos
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { unreadMessages: user.unreadMessages } }
    ).exec();
  }
  
  // Obtener todos los mensajes no leídos para un usuario
  async getUnreadMessages(userId: string): Promise<Record<string, number>> {
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.unreadMessages) {
      return {};
    }
    
    return user.unreadMessages;
  }
  
  // Marcar mensajes como leídos para un chat específico
  async markMessagesAsRead(userId: string, chatKey: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.unreadMessages) {
      return;
    }
    
    // Eliminar las notificaciones para este chat
    if (user.unreadMessages[chatKey]) {
      delete user.unreadMessages[chatKey];
      
      // Actualizar en la base de datos
      await this.userModel.updateOne(
        { _id: userId },
        { $set: { unreadMessages: user.unreadMessages } }
      ).exec();
    }
  }
}
