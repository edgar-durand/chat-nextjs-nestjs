import { IsArray, IsBoolean, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoomDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
  
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  members?: string[];
}
