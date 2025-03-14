import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileStorageController } from './file-storage.controller';
import { FileStorageService } from './file-storage.service';
import { FileStorage, FileStorageSchema } from './schemas/file-storage.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileStorage.name, schema: FileStorageSchema }
    ]),
  ],
  controllers: [FileStorageController],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}
