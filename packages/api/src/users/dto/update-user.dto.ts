import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MinLength, IsUrl, Matches } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email'] as const),
) {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)$|data:image\/[a-zA-Z+.-]+;base64,.*)$/, {
    message: 'avatar must be a valid URL or base64 encoded image',
  })
  avatar?: string;
}
