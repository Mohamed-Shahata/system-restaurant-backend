import { ApiPropertyOptional } from '@nestjs/swagger';
import { MenuCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryMenuItemsDto {
  @ApiPropertyOptional({ example: 1, description: 'رقم الصفحة', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'عدد العناصر في الصفحة',
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: MenuCategory,
    description: 'فلترة حسب التصنيف',
  })
  @IsEnum(MenuCategory)
  @IsOptional()
  category?: MenuCategory;

  @ApiPropertyOptional({
    example: true,
    description: 'فلترة حسب التوفر',
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    example: 'كباب',
    description: 'بحث بالاسم أو الوصف',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
