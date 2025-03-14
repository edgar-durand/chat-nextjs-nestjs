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
exports.MessageSchema = exports.Message = exports.FileAttachment = exports.FileType = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../../users/schemas/user.schema");
const room_schema_1 = require("../../rooms/schemas/room.schema");
var FileType;
(function (FileType) {
    FileType["IMAGE"] = "image";
    FileType["VIDEO"] = "video";
    FileType["DOCUMENT"] = "document";
    FileType["AUDIO"] = "audio";
})(FileType || (exports.FileType = FileType = {}));
class FileAttachment {
}
exports.FileAttachment = FileAttachment;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], FileAttachment.prototype, "filename", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], FileAttachment.prototype, "contentType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: FileType, required: true }),
    __metadata("design:type", String)
], FileAttachment.prototype, "fileType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], FileAttachment.prototype, "data", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], FileAttachment.prototype, "size", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FileAttachment.prototype, "fileId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], FileAttachment.prototype, "isLargeFile", void 0);
const FileAttachmentSchema = new mongoose_2.Schema({
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    fileType: { type: String, enum: Object.values(FileType), required: true },
    data: { type: String, required: false },
    size: { type: Number },
    fileId: { type: String },
    isLargeFile: { type: Boolean, default: false }
});
let Message = class Message extends mongoose_2.Document {
};
exports.Message = Message;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", user_schema_1.User)
], Message.prototype, "sender", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", String)
], Message.prototype, "content", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [FileAttachmentSchema], default: [] }),
    __metadata("design:type", Array)
], Message.prototype, "attachments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", user_schema_1.User)
], Message.prototype, "recipient", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.ObjectId, ref: 'Room' }),
    __metadata("design:type", room_schema_1.Room)
], Message.prototype, "room", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Message.prototype, "isRead", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [mongoose_2.Schema.Types.ObjectId], default: [] }),
    __metadata("design:type", Array)
], Message.prototype, "deletedFor", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], Message.prototype, "createdAt", void 0);
exports.Message = Message = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Message);
exports.MessageSchema = mongoose_1.SchemaFactory.createForClass(Message);
//# sourceMappingURL=message.schema.js.map