import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: 'b3a45e22-...', description: 'Menu item ID' })
  @IsUUID()
  menuItemId: string;

  @ApiPropertyOptional({ example: 'size-uuid-...', description: 'Size ID (optional)' })
  @IsUUID()
  @IsOptional()
  sizeId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['addon-uuid-1', 'addon-uuid-2'],
    description: 'List of addon IDs (optional)',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  @IsOptional()
  addonIds?: string[];

  @ApiPropertyOptional({ example: 2, default: 1, description: 'Quantity' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;

  @ApiPropertyOptional({ example: 'بدون بصل', description: 'Special note for this item' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  note?: string;
}
