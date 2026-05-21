import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../core/auth/decorator/roles.decorator.js';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/auth/guards/roles.guard.js';
import { CategoryService } from './category.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '[Admin] إضافة تصنيف جديد' })
  @ApiResponse({ status: 201, description: 'تم إضافة التصنيف بنجاح' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] عرض كل التصنيفات' })
  @ApiResponse({ status: 200, description: 'قائمة التصنيفات' })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] عرض تصنيف واحد' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'تفاصيل التصنيف' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] تعديل تصنيف' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'تم تعديل التصنيف بنجاح' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] حذف تصنيف' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'تم حذف التصنيف بنجاح' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoryService.remove(id);
  }
}
