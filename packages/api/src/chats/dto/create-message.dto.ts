import { Type } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsEnum, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { FileType } from '../schemas/message.schema';

export class FileAttachmentDto {
  @IsNotEmpty()
  @IsString()
  filename: string;

  @IsNotEmpty()
  @IsString()
  contentType: string;

  @IsNotEmpty()
  @IsEnum(FileType)
  fileType: FileType;

  @IsNotEmpty()
  @IsString()
  data: string; // Base64 encoded data

  @IsOptional()
  @IsNumber()
  size?: number;
}

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileAttachmentDto)
  attachments?: FileAttachmentDto[];

  @IsOptional()
  @IsMongoId()
  recipientId?: string;
  
  @IsOptional()
  @IsMongoId()
  roomId?: string;
}
