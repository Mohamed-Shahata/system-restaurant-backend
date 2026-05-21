import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'كباب مشوي', description: 'اسم الوجبة' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'كباب مشوي طازج مع الخضروات',
    description: 'وصف الوجبة',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 89.99, description: 'سعر الوجبة' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'تصنيف الوجبة',
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ example: true, description: 'هل الوجبة متاحة؟' })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: true, description: 'هل الوجبة عليها خصم؟' })
  @IsBoolean()
  @IsOptional()
  hasDiscount?: boolean;

  @ApiPropertyOptional({
    example: 15,
    description: 'نسبة الخصم من 0 إلى 100',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercentage?: number;

  @ApiPropertyOptional({ example: 4.6, description: 'تقييم الوجبة من 0 إلى 5' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;
}
