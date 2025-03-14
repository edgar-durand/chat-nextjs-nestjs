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
const file_storage_service_1 = require("../file-storage/file-storage.service");
let ChatsService = class ChatsService {
    constructor(messageModel, fileStorageService) {
        this.messageModel = messageModel;
        this.fileStorageService = fileStorageService;
        this.INLINE_FILE_SIZE_LIMIT = 5 * 1024 * 1024;
        this.MAX_FILE_SIZE = 50 * 1024 * 1024;
    }
    async create(createMessageDto, sender) {
        if (!createMessageDto.content && (!createMessageDto.attachments || createMessageDto.attachments.length === 0)) {
            throw new common_1.BadRequestException('Message must contain either text content or attachments');
        }
        let processedAttachments = [];
        if (createMessageDto.attachments && createMessageDto.attachments.length > 0) {
            for (const attachment of createMessageDto.attachments) {
                if (attachment.isLargeFile && attachment.fileId) {
                    processedAttachments.push({
                        filename: attachment.filename,
                        contentType: attachment.contentType,
                        fileType: attachment.fileType,
                        size: attachment.size,
                        fileId: attachment.fileId,
                        isLargeFile: true
                    });
                    continue;
                }
                const base64Size = attachment.data ? Buffer.from(attachment.data, 'base64').length : 0;
                const fileSize = attachment.size || base64Size;
                if (fileSize > this.MAX_FILE_SIZE) {
                    throw new common_1.BadRequestException(`File ${attachment.filename} exceeds the ${this.MAX_FILE_SIZE / (1024 * 1024)}MB size limit`);
                }
                if (fileSize <= this.INLINE_FILE_SIZE_LIMIT) {
                    processedAttachments.push(attachment);
                    continue;
                }
                if (fileSize > this.INLINE_FILE_SIZE_LIMIT) {
                    try {
                        if (!attachment.data) {
                            throw new common_1.BadRequestException('Missing file data for large file upload');
                        }
                        const fileBuffer = Buffer.from(attachment.data, 'base64');
                        const fileId = await this.fileStorageService.uploadCompleteFile(fileBuffer, {
                            originalFilename: attachment.filename,
                            contentType: attachment.contentType,
                            size: fileSize
                        });
                        processedAttachments.push({
                            filename: attachment.filename,
                            contentType: attachment.contentType,
                            fileType: attachment.fileType,
                            size: fileSize,
                            fileId: fileId,
                            isLargeFile: true,
                        });
                    }
                    catch (error) {
                        console.error('Error uploading large file:', error);
                        throw new common_1.BadRequestException(`Failed to upload file: ${error.message}`);
                    }
                }
            }
        }
        const newMessage = new this.messageModel(Object.assign(Object.assign({ content: createMessageDto.content, attachments: processedAttachments, sender: sender._id, deletedFor: [] }, (createMessageDto.recipientId && { recipient: createMessageDto.recipientId })), (createMessageDto.roomId && { room: createMessageDto.roomId })));
        return newMessage.save();
    }
    async findDirectMessages(userId, recipientId) {
        return this.messageModel.find({
            $or: [
                { sender: userId, recipient: recipientId },
                { sender: recipientId, recipient: userId },
            ],
            $and: [
                { deletedFor: { $ne: userId } },
                { deletedForEveryone: { $ne: true } }
            ]
        })
            .sort({ createdAt: 1 })
            .populate('sender', 'name email avatar')
            .exec();
    }
    async findRoomMessages(roomId) {
        return this.messageModel.find({
            room: roomId,
            deletedForEveryone: { $ne: true }
        })
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
    async clearDirectMessageHistory(userId, recipientId) {
        try {
            const result = await this.messageModel.updateMany({
                $or: [
                    { sender: userId, recipient: recipientId },
                    { sender: recipientId, recipient: userId },
                ],
                deletedFor: { $ne: userId }
            }, {
                $addToSet: { deletedFor: userId }
            }).exec();
            const invisibleMessagesWithAttachments = await this.messageModel.find({
                $or: [
                    { sender: userId, recipient: recipientId },
                    { sender: recipientId, recipient: userId },
                ],
                'attachments.isLargeFile': true,
                deletedFor: { $all: [userId, recipientId] }
            }).exec();
            for (const message of invisibleMessagesWithAttachments) {
                if (message.attachments && message.attachments.length > 0) {
                    for (const attachment of message.attachments) {
                        if (attachment.isLargeFile && attachment.fileId) {
                            try {
                                await this.fileStorageService.deleteFile(attachment.fileId);
                            }
                            catch (error) {
                                console.error(`Error eliminando archivo ${attachment.fileId}:`, error);
                            }
                        }
                    }
                }
            }
            await this.messageModel.deleteMany({
                $or: [
                    { sender: userId, recipient: recipientId },
                    { sender: recipientId, recipient: userId },
                ],
                deletedFor: { $all: [userId, recipientId] }
            }).exec();
            return { deletedCount: result.modifiedCount };
        }
        catch (error) {
            console.error('Error al limpiar historial de mensajes:', error);
            throw new common_1.BadRequestException(`No se pudo limpiar el historial: ${error.message}`);
        }
    }
    async deleteMessage(messageId, userId, deleteForEveryone) {
        try {
            const message = await this.messageModel.findById(messageId)
                .populate('sender', '_id id name')
                .exec();
            if (!message) {
                throw new common_1.NotFoundException(`Mensaje no encontrado`);
            }
            console.log('Datos del mensaje:', {
                messageId,
                userId,
                senderId: message.sender._id,
                senderIdString: message.sender._id.toString(),
                senderId2: message.sender.id
            });
            const isOwner = message.sender._id.toString() === userId ||
                (message.sender.id && message.sender.id.toString() === userId);
            console.log('¿Es propietario?', isOwner);
            if (deleteForEveryone && !isOwner) {
                console.log('MODO DE PRUEBA: Permitiendo eliminar mensajes para todos');
            }
            let updateQuery = {};
            if (deleteForEveryone) {
                updateQuery = {
                    $set: {
                        deletedForEveryone: true
                    }
                };
            }
            else {
                updateQuery = {
                    $addToSet: {
                        deletedFor: userId
                    }
                };
            }
            const updatedMessage = await this.messageModel.findByIdAndUpdate(messageId, updateQuery, { new: true }).exec();
            if (deleteForEveryone && message.attachments && message.attachments.length > 0) {
                for (const attachment of message.attachments) {
                    if (attachment.isLargeFile && attachment.fileId) {
                        try {
                            const deleteResult = await this.fileStorageService.deleteFile(attachment.fileId);
                            if (deleteResult) {
                                console.log(`Archivo adjunto eliminado correctamente: ${attachment.fileId} (${attachment.filename})`);
                            }
                            else {
                                console.warn(`No se pudo eliminar el archivo adjunto: ${attachment.fileId} (${attachment.filename})`);
                            }
                        }
                        catch (error) {
                            console.error(`Error eliminando archivo ${attachment.fileId}:`, error);
                        }
                    }
                }
            }
            return Object.assign(Object.assign({}, updatedMessage.toJSON()), { deleteForEveryone, recipientId: message.recipient, roomId: message.room });
        }
        catch (error) {
            console.error('Error al eliminar mensaje:', error);
            throw new common_1.BadRequestException(`No se pudo eliminar el mensaje: ${error.message}`);
        }
    }
};
exports.ChatsService = ChatsService;
exports.ChatsService = ChatsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(message_schema_1.Message.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        file_storage_service_1.FileStorageService])
], ChatsService);
//# sourceMappingURL=chats.service.js.map