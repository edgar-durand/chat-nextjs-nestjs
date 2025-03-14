"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const chats_controller_1 = require("./chats.controller");
const chats_service_1 = require("./chats.service");
const message_schema_1 = require("./schemas/message.schema");
const chat_gateway_1 = require("./gateways/chat.gateway");
const auth_module_1 = require("../auth/auth.module");
const users_module_1 = require("../users/users.module");
const file_storage_module_1 = require("../file-storage/file-storage.module");
const room_schema_1 = require("../rooms/schemas/room.schema");
let ChatsModule = class ChatsModule {
};
exports.ChatsModule = ChatsModule;
exports.ChatsModule = ChatsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: message_schema_1.Message.name, schema: message_schema_1.MessageSchema },
                { name: room_schema_1.Room.name, schema: room_schema_1.RoomSchema }
            ]),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            file_storage_module_1.FileStorageModule,
        ],
        controllers: [chats_controller_1.ChatsController],
        providers: [chats_service_1.ChatsService, chat_gateway_1.ChatGateway],
        exports: [chats_service_1.ChatsService],
    })
], ChatsModule);
//# sourceMappingURL=chats.module.js.map