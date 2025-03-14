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
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const room_schema_1 = require("./schemas/room.schema");
let RoomsService = class RoomsService {
    constructor(roomModel) {
        this.roomModel = roomModel;
    }
    async create(createRoomDto, creator) {
        const newRoom = new this.roomModel(Object.assign(Object.assign({}, createRoomDto), { creator: creator._id, members: [...(createRoomDto.members || []), creator._id] }));
        return newRoom.save();
    }
    async findAll() {
        return this.roomModel.find()
            .populate('creator', 'name email avatar')
            .exec();
    }
    async findOne(id) {
        const room = await this.roomModel.findById(id)
            .populate('creator', 'name email avatar')
            .populate('members', 'name email avatar isOnline lastActive')
            .exec();
        if (!room) {
            throw new common_1.NotFoundException(`Room with ID ${id} not found`);
        }
        return room;
    }
    async findUserRooms(userId) {
        return this.roomModel.find({ members: userId })
            .populate('creator', 'name email avatar')
            .exec();
    }
    async addMember(roomId, userId) {
        const room = await this.roomModel.findByIdAndUpdate(roomId, { $addToSet: { members: userId } }, { new: true })
            .populate('creator', 'name email avatar')
            .populate('members', 'name email avatar isOnline lastActive')
            .exec();
        if (!room) {
            throw new common_1.NotFoundException(`Room with ID ${roomId} not found`);
        }
        return room;
    }
    async removeMember(roomId, userId) {
        const room = await this.roomModel.findByIdAndUpdate(roomId, { $pull: { members: userId } }, { new: true })
            .populate('creator', 'name email avatar')
            .populate('members', 'name email avatar isOnline lastActive')
            .exec();
        if (!room) {
            throw new common_1.NotFoundException(`Room with ID ${roomId} not found`);
        }
        return room;
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(room_schema_1.Room.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map