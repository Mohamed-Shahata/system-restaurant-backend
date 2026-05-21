import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Main Courses', description: 'اسم التصنيف' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'main_course',
    description: 'slug فريد للتصنيف',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({
    example: 'Main dishes and entrees',
    description: 'وصف التصنيف',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'هل التصنيف فعال؟' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
