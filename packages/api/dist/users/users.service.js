"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("./schemas/user.schema");
const room_schema_1 = require("../rooms/schemas/room.schema");
let UsersService = class UsersService {
    constructor(userModel, roomModel) {
        this.userModel = userModel;
        this.roomModel = roomModel;
    }
    async create(createUserDto) {
        const createdUser = new this.userModel(createUserDto);
        return createdUser.save();
    }
    async findAll() {
        return this.userModel.find().exec();
    }
    async findOne(id) {
        const user = await this.userModel.findById(id).exec();
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }
    async findByEmail(email) {
        return this.userModel.findOne({ email }).exec();
    }
    async updateOnlineStatus(id, isOnline) {
        const updates = {
            isOnline,
        };
        if (!isOnline) {
            updates.lastActive = new Date();
        }
        const user = await this.userModel.findByIdAndUpdate(id, updates, { new: true }).exec();
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }
    async updateProfile(userId, updateUserDto) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        if (updateUserDto.newPassword) {
            if (!updateUserDto.currentPassword) {
                throw new common_1.BadRequestException('Current password is required to set a new password');
            }
            const isPasswordValid = await user.comparePassword(updateUserDto.currentPassword);
            if (!isPasswordValid) {
                throw new common_1.BadRequestException('Current password is incorrect');
            }
            user.password = updateUserDto.newPassword;
            delete updateUserDto.currentPassword;
            delete updateUserDto.newPassword;
        }
        if (updateUserDto.name) {
            user.name = updateUserDto.name;
        }
        if (updateUserDto.avatar) {
            user.avatar = updateUserDto.avatar;
        }
        await user.save();
        return user;
    }
    async isRoomMember(userId, roomId) {
        const room = await this.roomModel.findById(roomId).exec();
        if (!room) {
            return false;
        }
        return room.members.some((memberId) => memberId.toString() === userId.toString());
    }
    async incrementUnreadMessage(userId, chatKey) {
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            return;
        }
        if (!user.unreadMessages) {
            user.unreadMessages = {};
        }
        user.unreadMessages[chatKey] = (user.unreadMessages[chatKey] || 0) + 1;
        await this.userModel.updateOne({ _id: userId }, { $set: { unreadMessages: user.unreadMessages } }).exec();
    }
    async getUnreadMessages(userId) {
        const user = await this.userModel.findById(userId).exec();
        if (!user || !user.unreadMessages) {
            return {};
        }
        return user.unreadMessages;
    }
    async markMessagesAsRead(userId, chatKey) {
        const user = await this.userModel.findById(userId).exec();
        if (!user || !user.unreadMessages) {
            return;
        }
        if (user.unreadMessages[chatKey]) {
            delete user.unreadMessages[chatKey];
            await this.userModel.updateOne({ _id: userId }, { $set: { unreadMessages: user.unreadMessages } }).exec();
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(room_schema_1.Room.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], UsersService);
//# sourceMappingURL=users.service.js.map