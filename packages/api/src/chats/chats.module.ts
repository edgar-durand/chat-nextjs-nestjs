import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatsService } from './chats.service';
import { ChatsController } from './chats.controller';
import { Message, MessageSchema } from './schemas/message.schema';
import { UsersModule } from '../users/users.module';
import { ChatGateway } from './gateways/chat.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    UsersModule,
    AuthModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatGateway],
  exports: [ChatsService],
})
export class ChatsModule {}
