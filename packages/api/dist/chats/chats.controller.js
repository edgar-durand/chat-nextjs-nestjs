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
exports.ChatsController = void 0;
const common_1 = require("@nestjs/common");
const chats_service_1 = require("./chats.service");
const create_message_dto_1 = require("./dto/create-message.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const file_storage_service_1 = require("../file-storage/file-storage.service");
let ChatsController = class ChatsController {
    constructor(chatsService, fileStorageService) {
        this.chatsService = chatsService;
        this.fileStorageService = fileStorageService;
    }
    create(createMessageDto, req) {
        return this.chatsService.create(createMessageDto, req.user);
    }
    findDirectMessages(recipientId, req) {
        return this.chatsService.findDirectMessages(req.user._id, recipientId);
    }
    async clearDirectMessages(recipientId, req) {
        try {
            const result = await this.chatsService.clearDirectMessageHistory(req.user._id, recipientId);
            return {
                success: true,
                message: `Se han eliminado ${result.deletedCount} mensajes del historial`,
                deletedCount: result.deletedCount
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message || 'Error al limpiar el historial de mensajes'
            };
        }
    }
    findRoomMessages(roomId) {
        return this.chatsService.findRoomMessages(roomId);
    }
    async getFile(fileId, preview, res) {
        try {
            const result = await this.fileStorageService.getFile(fileId);
            if (!result || !result.file || !result.file.complete) {
                return res.status(404).json({ message: 'Archivo no encontrado o incompleto' });
            }
            if (preview === 'true') {
                const metadata = await this.fileStorageService.getFileMetadata(fileId);
                if (metadata) {
                    return res.json(metadata);
                }
                return res.status(404).json({ message: 'Metadatos no disponibles' });
            }
            const fileData = result.data;
            res.setHeader('Content-Type', result.file.contentType);
            res.setHeader('Content-Disposition', `inline; filename=${result.file.originalFilename}`);
            res.setHeader('Content-Length', fileData.length);
            if (result.file.contentType.startsWith('video/')) {
                res.setHeader('Accept-Ranges', 'bytes');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Range');
            }
            return res.send(fileData);
        }
        catch (error) {
            console.error('Error al recuperar archivo:', error);
            return res.status(500).json({ message: 'Error al obtener el archivo', error: error.message });
        }
    }
    async getFileThumbnail(fileId, res) {
        try {
            const metadata = await this.fileStorageService.getFileMetadata(fileId);
            if (!metadata) {
                return res.status(404).json({ message: 'Archivo no encontrado' });
            }
            const result = await this.fileStorageService.getFile(fileId);
            if (result.file.thumbnail) {
                res.setHeader('Content-Type', 'image/jpeg');
                return res.send(Buffer.from(result.file.thumbnail, 'base64'));
            }
            if (metadata.mediaType === 'video') {
                res.setHeader('Content-Type', 'image/png');
                res.sendFile('video-placeholder.png', { root: './public' });
                return;
            }
            return res.json({
                fileType: metadata.fileType,
                mediaType: metadata.mediaType,
                filename: metadata.filename
            });
        }
        catch (error) {
            console.error('Error al obtener miniatura:', error);
            return res.status(500).json({ message: 'Error al obtener la miniatura', error: error.message });
        }
    }
    markAsRead(id) {
        return this.chatsService.markAsRead(id);
    }
    getUnreadCount(req) {
        return this.chatsService.getUserUnreadCount(req.user._id)
            .then(count => ({ count }));
    }
};
exports.ChatsController = ChatsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_message_dto_1.CreateMessageDto, Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('direct/:recipientId'),
    __param(0, (0, common_1.Param)('recipientId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "findDirectMessages", null);
__decorate([
    (0, common_1.Delete)('direct/:recipientId'),
    __param(0, (0, common_1.Param)('recipientId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "clearDirectMessages", null);
__decorate([
    (0, common_1.Get)('room/:roomId'),
    __param(0, (0, common_1.Param)('roomId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "findRoomMessages", null);
__decorate([
    (0, common_1.Get)('file/:fileId'),
    __param(0, (0, common_1.Param)('fileId')),
    __param(1, (0, common_1.Query)('preview')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "getFile", null);
__decorate([
    (0, common_1.Get)('file/:fileId/thumbnail'),
    __param(0, (0, common_1.Param)('fileId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "getFileThumbnail", null);
__decorate([
    (0, common_1.Post)(':id/read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Get)('unread'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "getUnreadCount", null);
exports.ChatsController = ChatsController = __decorate([
    (0, common_1.Controller)('chats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [chats_service_1.ChatsService,
        file_storage_service_1.FileStorageService])
], ChatsController);
//# sourceMappingURL=chats.controller.js.map