import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, plainToInstance } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  toBoolean,
  toJsonArray,
} from '../../../shared/transformers/form-data.transformers';
import { CreateMenuItemAddonDto } from './create-menu-item-addon.dto';
import { CreateMenuItemSizeDto } from './create-menu-item-size.dto';

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

  @ApiProperty({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'تصنيف الوجبة',
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ example: true, description: 'هل الوجبة متاحة؟' })
  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: true, description: 'هل الوجبة عليها خصم؟' })
  @Transform(toBoolean)
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

  @ApiProperty({
    type: [CreateMenuItemSizeDto],
    description: 'الأحجام المتاحة للوجبة، على الأقل حجم واحد',
    example: [
      { slug: 'small', label: 'صغير', price: 12 },
      { slug: 'medium', label: 'وسط', price: 15 },
      { slug: 'large', label: 'كبير', price: 18 },
    ],
  })
  @Transform(({ value }) => {
    const parsed = toJsonArray({ value });
    if (!Array.isArray(parsed)) return parsed;
    return parsed.map((item) => plainToInstance(CreateMenuItemSizeDto, item));
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'لازم تضيف حجم واحد على الأقل' })
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemSizeDto)
  sizes: CreateMenuItemSizeDto[];

  @ApiPropertyOptional({
    type: [CreateMenuItemAddonDto],
    description: 'الإضافات الاختيارية للوجبة',
    example: [{ name: 'صوص ثوم', price: 5.5 }],
  })
  @Transform(({ value }) => {
    const parsed = toJsonArray({ value });
    if (!Array.isArray(parsed)) return parsed;
    return parsed.map((item) => plainToInstance(CreateMenuItemAddonDto, item));
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMenuItemAddonDto)
  addons?: CreateMenuItemAddonDto[];
}
