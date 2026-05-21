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
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/auth/guards/roles.guard.js';
import { Roles } from '../../core/auth/decorator/roles.decorator.js';

import { MenuService } from './menu.service.js';
import { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto.js';
import { QueryMenuItemsDto } from './dto/query-menu-items.dto.js';

// ─── Multer config: حد أقصى 5 صور، 5MB للصورة ───────────────────────────────
const IMAGES_UPLOAD_CONFIG = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

@ApiTags('Menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ─── Create (Admin Only) ────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @UseInterceptors(FilesInterceptor('images', 5, IMAGES_UPLOAD_CONFIG))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[Admin] إضافة وجبة جديدة (حد أقصى 5 صور)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'price', 'categoryId'],
      properties: {
        name: { type: 'string', example: 'كباب مشوي' },
        description: { type: 'string', example: 'كباب طازج مع الخضروات' },
        price: { type: 'number', example: 89.99 },
        categoryId: {
          type: 'string',
          format: 'uuid',
          example: '22222222-2222-2222-2222-222222222222',
        },
        isAvailable: { type: 'boolean', example: true },
        hasDiscount: { type: 'boolean', example: true },
        discountPercentage: { type: 'number', example: 15 },
        rating: { type: 'number', example: 4.6 },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'صور الوجبة (حد أقصى 5)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'تم إضافة الوجبة بنجاح' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية' })
  create(
    @Body() dto: CreateMenuItemDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.menuService.create(dto, images ?? []);
  }

  // ─── Get All (Public) ───────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'عرض كل الوجبات مع فلترة وباجينيشن' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
  })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'قائمة الوجبات مع metadata' })
  findAll(@Query() query: QueryMenuItemsDto) {
    return this.menuService.findAll(query);
  }

  // ─── Get One (Public) ───────────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'عرض وجبة واحدة بالـ ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'تفاصيل الوجبة' })
  @ApiResponse({ status: 404, description: 'الوجبة غير موجودة' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.findOne(id);
  }

  // ─── Update Data + Add Images (Admin Only) ──────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @UseInterceptors(FilesInterceptor('images', 5, IMAGES_UPLOAD_CONFIG))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '[Admin] تعديل بيانات وجبة و/أو إضافة صور جديدة',
    description:
      'الصور الجديدة تُضاف للموجودة. لحذف صورة بعينها استخدم DELETE /menu/:id/images/:imageId',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        categoryId: {
          type: 'string',
          format: 'uuid',
        },
        isAvailable: { type: 'boolean' },
        hasDiscount: { type: 'boolean' },
        discountPercentage: { type: 'number' },
        rating: { type: 'number' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'صور جديدة تُضاف للموجودة',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'تم تعديل الوجبة بنجاح' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية' })
  @ApiResponse({ status: 404, description: 'الوجبة غير موجودة' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuItemDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.menuService.update(id, dto, images ?? []);
  }

  // ─── Delete Single Image (Admin Only) ──────────────────────────────────────

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] حذف صورة واحدة من الوجبة' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'ID الوجبة' })
  @ApiParam({ name: 'imageId', type: 'string', format: 'uuid', description: 'ID الصورة' })
  @ApiResponse({ status: 200, description: 'تم حذف الصورة، يرجع الوجبة محدثة' })
  @ApiResponse({ status: 404, description: 'الوجبة أو الصورة غير موجودة' })
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.menuService.removeImage(id, imageId);
  }

  // ─── Delete All Images (Admin Only) ────────────────────────────────────────

  @Delete(':id/images')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] حذف كل صور الوجبة' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'تم حذف كل الصور، يرجع الوجبة محدثة' })
  @ApiResponse({ status: 404, description: 'الوجبة غير موجودة' })
  removeAllImages(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.removeAllImages(id);
  }

  // ─── Delete Item (Admin Only) ───────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] حذف وجبة كاملة مع كل صورها' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'تم حذف الوجبة وكل صورها بنجاح' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية' })
  @ApiResponse({ status: 404, description: 'الوجبة غير موجودة' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.remove(id);
  }
}
