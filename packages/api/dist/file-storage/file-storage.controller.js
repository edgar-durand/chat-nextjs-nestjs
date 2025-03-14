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
exports.FileStorageController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const file_storage_service_1 = require("./file-storage.service");
let FileStorageController = class FileStorageController {
    constructor(fileStorageService) {
        this.fileStorageService = fileStorageService;
    }
    async initializeFile(fileData) {
        try {
            const fileId = await this.fileStorageService.initializeFile(fileData);
            return { success: true, fileId, filename: `${Date.now()}-${fileData.originalFilename}` };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to initialize file: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async uploadChunk(chunkData) {
        try {
            const isComplete = await this.fileStorageService.addChunk(chunkData);
            return { success: true, complete: isComplete };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to upload chunk: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async uploadFile(file, metadata) {
        try {
            console.log(`Recibiendo archivo: ${file.originalname}, tamaño: ${file.size / 1024 / 1024}MB`);
            const contentType = metadata.contentType || file.mimetype;
            const fileId = await this.fileStorageService.uploadCompleteFile(file.buffer, {
                originalFilename: file.originalname,
                contentType: contentType,
                size: file.size
            });
            return {
                success: true,
                fileId,
                filename: file.originalname,
                size: file.size,
                contentType: contentType
            };
        }
        catch (error) {
            console.error('Error al subir archivo:', error);
            throw new common_1.HttpException(`Error al subir archivo: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getFile(fileId, res) {
        try {
            const result = await this.fileStorageService.getFile(fileId);
            if (!result || !result.file) {
                throw new common_1.HttpException('File not found', common_1.HttpStatus.NOT_FOUND);
            }
            if (!result.file.complete) {
                throw new common_1.HttpException('File is not complete yet', common_1.HttpStatus.BAD_REQUEST);
            }
            const fileData = result.data;
            res.setHeader('Content-Type', result.file.contentType);
            res.setHeader('Content-Disposition', `attachment; filename=${result.file.originalFilename}`);
            res.setHeader('Content-Length', fileData.length);
            res.send(fileData);
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException(`Failed to retrieve file: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async listFiles() {
        try {
            const files = await this.fileStorageService.listFiles();
            return { success: true, files };
        }
        catch (error) {
            throw new common_1.HttpException(`Failed to list files: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteFile(fileId) {
        try {
            const success = await this.fileStorageService.deleteFile(fileId);
            if (!success) {
                throw new common_1.HttpException('File not found', common_1.HttpStatus.NOT_FOUND);
            }
            return { success: true };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException(`Failed to delete file: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.FileStorageController = FileStorageController;
__decorate([
    (0, common_1.Post)('initialize'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FileStorageController.prototype, "initializeFile", null);
__decorate([
    (0, common_1.Post)('chunk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FileStorageController.prototype, "uploadChunk", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)(new common_1.ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 1024 * 1024 * 100 })
        .build({
        fileIsRequired: true,
        errorHttpStatusCode: common_1.HttpStatus.BAD_REQUEST,
    }))),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FileStorageController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Get)(':fileId'),
    __param(0, (0, common_1.Param)('fileId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FileStorageController.prototype, "getFile", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FileStorageController.prototype, "listFiles", null);
__decorate([
    (0, common_1.Delete)(':fileId'),
    __param(0, (0, common_1.Param)('fileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FileStorageController.prototype, "deleteFile", null);
exports.FileStorageController = FileStorageController = __decorate([
    (0, common_1.Controller)('file-storage'),
    __metadata("design:paramtypes", [file_storage_service_1.FileStorageService])
], FileStorageController);
//# sourceMappingURL=file-storage.controller.js.map