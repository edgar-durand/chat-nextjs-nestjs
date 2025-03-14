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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorageSchema = exports.FileStorage = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let FileStorage = class FileStorage {
};
exports.FileStorage = FileStorage;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], FileStorage.prototype, "filename", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], FileStorage.prototype, "originalFilename", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], FileStorage.prototype, "contentType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], FileStorage.prototype, "size", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], FileStorage.prototype, "chunkSize", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], FileStorage.prototype, "totalChunks", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: [Buffer] }),
    __metadata("design:type", Array)
], FileStorage.prototype, "chunks", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], FileStorage.prototype, "complete", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['image', 'video', 'audio', 'document'] }),
    __metadata("design:type", String)
], FileStorage.prototype, "mediaType", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FileStorage.prototype, "fileType", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FileStorage.prototype, "thumbnail", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], FileStorage.prototype, "storedInFilesystem", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FileStorage.prototype, "filePath", void 0);
exports.FileStorage = FileStorage = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], FileStorage);
exports.FileStorageSchema = mongoose_1.SchemaFactory.createForClass(FileStorage);
//# sourceMappingURL=file-storage.schema.js.map