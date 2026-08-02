import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  toBoolean,
  toStringArray,
} from '../../../shared/transformers/form-data.transformers';

export class CreateOfferDto {
  @ApiProperty({
    example: 'عرض الوجبة العائلية',
    description: 'عنوان العرض',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({
    example: 'عرض خاص يشمل وجبتين رئيسيتين ومشروبين بسعر مخفض',
    description: 'وصف العرض',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 149.99, description: 'سعر العرض' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ example: true, description: 'هل العرض متاح؟' })
  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiProperty({
    example: ['11111111-1111-1111-1111-111111111111'],
    description:
      'الوجبات اللي هتكون جزء من العرض (IDs)، تُرسل كـ JSON array أو IDs مفصولة بفواصل',
    isArray: true,
    type: String,
  })
  @Transform(toStringArray)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  menuItemIds: string[];
}
