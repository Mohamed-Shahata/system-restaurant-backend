import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SizeLabel } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class CreateSizeDto {
  @ApiProperty({ example: 'b3a45e22-...', description: 'Menu item ID' })
  @IsUUID()
  menuItemId: string;

  @ApiProperty({ enum: SizeLabel, example: SizeLabel.medium, description: 'Size label' })
  @IsEnum(SizeLabel)
  label: SizeLabel;

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
