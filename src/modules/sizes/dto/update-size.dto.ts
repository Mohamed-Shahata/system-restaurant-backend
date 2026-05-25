import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateSizeDto {
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
