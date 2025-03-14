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
exports.ChatsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const message_schema_1 = require("./schemas/message.schema");
let ChatsService = class ChatsService {
    constructor(messageModel) {
        this.messageModel = messageModel;
    }
    async create(createMessageDto, sender) {
        const newMessage = new this.messageModel(Object.assign(Object.assign({ content: createMessageDto.content, sender: sender._id }, (createMessageDto.recipientId && { recipient: createMessageDto.recipientId })), (createMessageDto.roomId && { room: createMessageDto.roomId })));
        return newMessage.save();
    }
    async findDirectMessages(userId, recipientId) {
        return this.messageModel.find({
            $or: [
                { sender: userId, recipient: recipientId },
                { sender: recipientId, recipient: userId },
            ],
        })
            .sort({ createdAt: 1 })
            .populate('sender', 'name email avatar')
            .exec();
    }
    async findRoomMessages(roomId) {
        return this.messageModel.find({ room: roomId })
            .sort({ createdAt: 1 })
            .populate('sender', 'name email avatar')
            .exec();
    }
    async markAsRead(messageId) {
        const message = await this.messageModel.findByIdAndUpdate(messageId, { isRead: true }, { new: true }).exec();
        if (!message) {
            throw new common_1.NotFoundException(`Message with ID ${messageId} not found`);
        }
        return message;
    }
    async getUserUnreadCount(userId) {
        return this.messageModel.countDocuments({
            recipient: userId,
            isRead: false,
        }).exec();
    }
};
exports.ChatsService = ChatsService;
exports.ChatsService = ChatsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(message_schema_1.Message.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ChatsService);
//# sourceMappingURL=chats.service.js.map