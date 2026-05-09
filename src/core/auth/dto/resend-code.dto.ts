import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendCodeDto {
  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;
}
