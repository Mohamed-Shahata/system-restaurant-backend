import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateSizeDto {
  @ApiProperty({ example: 'b3a45e22-...', description: 'Menu item ID' })
  @IsUUID()
  menuItemId: string;

  @ApiProperty({ example: 'small', description: 'English size slug' })
  @IsString()
  @MaxLength(50)
  slug: string;

  @ApiProperty({ example: 'صغير', description: 'Arabic size label' })
  @IsString()
  @MaxLength(50)
  label: string;

  @ApiProperty({ example: 12.0, description: 'Price for this size' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
