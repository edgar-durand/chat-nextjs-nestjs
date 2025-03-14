import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
}
