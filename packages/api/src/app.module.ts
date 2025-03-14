import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatsModule } from './chats/chats.module';
import { RoomsModule } from './rooms/rooms.module';
import { FileStorageModule } from './file-storage/file-storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/chat',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ChatsModule,
    RoomsModule,
    FileStorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
