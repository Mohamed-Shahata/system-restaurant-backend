import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { MenuCategory } from '@prisma/client';

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
    enum: MenuCategory,
    example: MenuCategory.main_course,
    description: 'تصنيف الوجبة',
  })
  @IsEnum(MenuCategory)
  category: MenuCategory;

  @ApiPropertyOptional({ example: true, description: 'هل الوجبة متاحة؟' })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
