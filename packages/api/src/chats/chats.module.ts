import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { Message, MessageSchema } from './schemas/message.schema';
import { ChatGateway } from './gateways/chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { Room, RoomSchema } from '../rooms/schemas/room.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Room.name, schema: RoomSchema }
    ]),
    AuthModule,
    UsersModule,
    FileStorageModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatGateway],
  exports: [ChatsService],
})
export class ChatsModule {}
