import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ahmed' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Mohamed' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '01012345678' })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  phonePrimary?: string;

  @ApiPropertyOptional({ example: '01098765432', nullable: true })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  phoneSecondary?: string | null;

  @ApiPropertyOptional({ example: 'Cairo, Egypt', nullable: true })
  @IsString()
  @IsOptional()
  address?: string | null;
}
