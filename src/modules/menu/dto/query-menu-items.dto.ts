import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

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
    example: '22222222-2222-2222-2222-222222222222',
    description: 'فلترة حسب التصنيف',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

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
