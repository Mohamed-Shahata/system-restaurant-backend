import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { toBoolean } from './transform.helpers';

export class QueryOffersDto {
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
    example: true,
    description: 'فلترة حسب التوفر',
  })
  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
