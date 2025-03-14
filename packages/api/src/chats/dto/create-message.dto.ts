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

  @IsOptional()
  @IsString()
  data?: string; // Base64 encoded data - ahora opcional para archivos grandes ya subidos

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsString()
  fileId?: string; // ID de referencia para archivos grandes almacenados por separado

  @IsOptional()
  isLargeFile?: boolean; // Indicador para archivos almacenados aparte
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
