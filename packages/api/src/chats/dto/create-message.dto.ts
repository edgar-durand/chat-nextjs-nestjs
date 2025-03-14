import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsMongoId()
  recipientId?: string;
  
  @IsOptional()
  @IsMongoId()
  roomId?: string;
}
