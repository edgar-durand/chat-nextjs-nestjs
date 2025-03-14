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
exports.FileStorageService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const file_storage_schema_1 = require("./schemas/file-storage.schema");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const MONGO_DOC_SIZE_LIMIT = 15 * 1024 * 1024;
let FileStorageService = class FileStorageService {
    constructor(fileStorageModel) {
        this.fileStorageModel = fileStorageModel;
        this.filesDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(this.filesDir)) {
            fs.mkdirSync(this.filesDir, { recursive: true });
        }
    }
    async initializeFile(data) {
        const newFile = new this.fileStorageModel({
            filename: `${Date.now()}-${data.originalFilename}`,
            originalFilename: data.originalFilename,
            contentType: data.contentType,
            size: data.size,
            chunkSize: data.chunkSize,
            totalChunks: data.totalChunks,
            chunks: Array(data.totalChunks).fill(null),
            complete: false,
        });
        const savedFile = await newFile.save();
        return savedFile._id.toString();
    }
    async addChunk(data) {
        const file = await this.fileStorageModel.findOne({
            filename: data.filename
        });
        if (!file) {
            throw new Error(`File with name ${data.filename} not found`);
        }
        file.chunks[data.chunkIndex] = data.chunkData;
        const complete = file.chunks.every(chunk => chunk != null);
        if (complete) {
            file.complete = true;
            file.mediaType = this.determineMediaType(data.contentType);
            file.fileType = this.determineFileType(data.contentType);
        }
        await file.save();
        return complete;
    }
    determineMediaType(contentType) {
        if (contentType.startsWith('image/'))
            return 'image';
        if (contentType.startsWith('video/'))
            return 'video';
        if (contentType.startsWith('audio/'))
            return 'audio';
        return 'document';
    }
    determineFileType(contentType) {
        return contentType.split('/')[1] || 'unknown';
    }
    async uploadCompleteFile(buffer, metadata) {
        try {
            console.log(`Iniciando carga de archivo grande: ${metadata.originalFilename}, tamaño: ${metadata.size / 1024 / 1024}MB, tipo: ${metadata.contentType}`);
            if (!buffer || buffer.length === 0) {
                throw new Error('El buffer está vacío');
            }
            if (Math.abs(buffer.length - metadata.size) > metadata.size * 0.1) {
                console.warn(`Advertencia: Discrepancia en el tamaño del archivo. Reportado: ${metadata.size}, Recibido: ${buffer.length}`);
            }
            const timestamp = Date.now();
            const randomString = crypto.randomBytes(8).toString('hex');
            const fileExtension = path.extname(metadata.originalFilename);
            const safeFilename = `${timestamp}-${randomString}${fileExtension}`;
            const filePath = path.join(this.filesDir, safeFilename);
            let newFile;
            let storeInFilesystem = false;
            if (buffer.length > MONGO_DOC_SIZE_LIMIT) {
                storeInFilesystem = true;
                console.log(`Archivo demasiado grande para MongoDB (${buffer.length / 1024 / 1024}MB), guardando en el sistema de archivos: ${filePath}`);
                await fs.promises.writeFile(filePath, buffer);
                newFile = new this.fileStorageModel({
                    filename: safeFilename,
                    originalFilename: metadata.originalFilename,
                    contentType: metadata.contentType,
                    size: buffer.length,
                    chunkSize: 0,
                    totalChunks: 0,
                    chunks: [],
                    complete: true,
                    mediaType: this.determineMediaType(metadata.contentType),
                    fileType: this.determineFileType(metadata.contentType),
                    storedInFilesystem: true,
                    filePath: filePath
                });
            }
            else {
                console.log(`Guardando archivo en MongoDB: ${metadata.originalFilename} (${buffer.length / 1024 / 1024}MB)`);
                newFile = new this.fileStorageModel({
                    filename: safeFilename,
                    originalFilename: metadata.originalFilename,
                    contentType: metadata.contentType,
                    size: buffer.length,
                    chunkSize: buffer.length,
                    totalChunks: 1,
                    chunks: [buffer],
                    complete: true,
                    mediaType: this.determineMediaType(metadata.contentType),
                    fileType: this.determineFileType(metadata.contentType),
                    storedInFilesystem: false
                });
            }
            console.log(`Guardando metadatos en base de datos: ${metadata.originalFilename}`);
            const savedFile = await newFile.save();
            console.log(`Archivo guardado exitosamente: ${savedFile._id.toString()}`);
            return savedFile._id.toString();
        }
        catch (error) {
            console.error('Error al guardar archivo completo:', error);
            throw error;
        }
    }
    async getFile(fileId) {
        const file = await this.fileStorageModel.findById(fileId);
        if (!file) {
            throw new Error(`Archivo con ID ${fileId} no encontrado`);
        }
        if (!file.complete) {
            throw new Error(`Archivo con ID ${fileId} no está completo`);
        }
        let fileData;
        if (file.storedInFilesystem) {
            try {
                fileData = await fs.promises.readFile(file.filePath);
            }
            catch (error) {
                console.error(`Error leyendo archivo del sistema de archivos: ${file.filePath}`, error);
                throw new Error(`No se pudo leer el archivo del sistema de archivos: ${error.message}`);
            }
        }
        else {
            fileData = Buffer.concat(file.chunks);
        }
        return { file, data: fileData };
    }
    async getFileByName(filename) {
        return this.fileStorageModel.findOne({ filename });
    }
    async getFileMetadata(fileId) {
        const file = await this.fileStorageModel.findById(fileId, {
            contentType: 1,
            mediaType: 1,
            fileType: 1,
            size: 1,
            originalFilename: 1,
            complete: 1
        });
        if (!file)
            return null;
        return {
            contentType: file.contentType,
            mediaType: file.mediaType || this.determineMediaType(file.contentType),
            fileType: file.fileType || this.determineFileType(file.contentType),
            size: file.size,
            filename: file.originalFilename,
            complete: file.complete
        };
    }
    async listFiles() {
        const files = await this.fileStorageModel.find({ complete: true });
        return files.map(file => ({
            fileId: file._id.toString(),
            filename: file.originalFilename,
            contentType: file.contentType,
            size: file.size,
            createdAt: file['createdAt']
        }));
    }
    async deleteFile(fileId) {
        const result = await this.fileStorageModel.deleteOne({ _id: fileId });
        return result.deletedCount > 0;
    }
};
exports.FileStorageService = FileStorageService;
exports.FileStorageService = FileStorageService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(file_storage_schema_1.FileStorage.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], FileStorageService);
//# sourceMappingURL=file-storage.service.js.map