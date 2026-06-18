import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSizeDto {
  @ApiPropertyOptional({ example: 'large' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: 'كبير' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ example: 14.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
