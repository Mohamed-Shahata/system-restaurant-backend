import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RemoveAvatarDto {
  @ApiProperty({
    example: 'users/avatar_abc123',
    description: 'Cloudinary public ID of the avatar',
  })
  @IsString()
  publicId: string;
}
