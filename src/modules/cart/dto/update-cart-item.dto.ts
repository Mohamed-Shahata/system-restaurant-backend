import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCartItemDto {
  @ApiPropertyOptional({ example: 'size-uuid-...', description: 'New size ID' })
  @IsUUID()
  @IsOptional()
  sizeId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['addon-uuid-1'],
    description: 'New list of addon IDs (replaces existing)',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  @IsOptional()
  addonIds?: string[];

  @ApiPropertyOptional({ example: 3, description: 'New quantity' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: 'بدون ثوم', description: 'Updated note' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsOptional()
  note?: string;
}
