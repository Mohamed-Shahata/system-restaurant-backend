import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class UpdateAddonDto {
  @ApiPropertyOptional({ example: 'Hot Sauce' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 7.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  price?: number;
}
