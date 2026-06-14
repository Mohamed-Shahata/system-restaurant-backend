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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorator/roles.decorator';

import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { QueryOffersDto } from './dto/query-offers.dto';

// ─── Multer config: صورة واحدة بحد أقصى 5MB ─────────────────────────────────
const IMAGE_UPLOAD_CONFIG = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

const OFFER_BODY_SCHEMA: SchemaObject = {
  type: 'object',
  required: ['title', 'price', 'menuItemIds'],
  properties: {
    title: { type: 'string', example: 'عرض الوجبة العائلية' },
    description: {
      type: 'string',
      example: 'عرض خاص يشمل وجبتين رئيسيتين ومشروبين بسعر مخفض',
    },
    price: { type: 'number', example: 149.99 },
    isAvailable: { type: 'boolean', example: true },
    menuItemIds: {
      type: 'array',
      items: { type: 'string', format: 'uuid' },
      description:
        'الوجبات اللي هتكون جزء من العرض، تُرسل كـ JSON array أو IDs مفصولة بفواصل',
    },
    image: {
      type: 'string',
      format: 'binary',
      description: 'صورة العرض (صورة واحدة)',
    },
  },
};

@ApiTags('Offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  // ─── Create (Admin Only) ────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @UseInterceptors(FileInterceptor('image', IMAGE_UPLOAD_CONFIG))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[Admin] إضافة عرض جديد' })
  @ApiBody({ schema: OFFER_BODY_SCHEMA })
  @ApiResponse({ status: 201, description: 'تم إضافة العرض بنجاح' })
  @ApiResponse({ status: 400, description: 'وجبة أو أكثر غير موجودة' })
  @ApiResponse({ status: 401, description: 'غير مصرح' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية' })
  create(
    @Body() dto: CreateOfferDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.offersService.create(dto, image);
  }

  // ─── Get All (Public) ───────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'عرض كل العروض مع باجينيشن' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'قائمة العروض مع metadata' })
  findAll(@Query() query: QueryOffersDto) {
    return this.offersService.findAll(query);
  }

  // ─── Get One (Public) ───────────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'عرض تفاصيل عرض واحد بالـ ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'تفاصيل العرض' })
  @ApiResponse({ status: 404, description: 'العرض غير موجود' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.findOne(id);
  }

  // ─── Update (Admin Only) ─────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @UseInterceptors(FileInterceptor('image', IMAGE_UPLOAD_CONFIG))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '[Admin] تعديل عرض',
    description:
      'لو اتبعتت menuItemIds هتستبدل قائمة الوجبات بالكامل. لو اتبعتت صورة جديدة، القديمة هتُحذف.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      ...OFFER_BODY_SCHEMA,
      required: [],
    },
  })
  @ApiResponse({ status: 200, description: 'تم تعديل العرض بنجاح' })
  @ApiResponse({ status: 400, description: 'وجبة أو أكثر غير موجودة' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية' })
  @ApiResponse({ status: 404, description: 'العرض غير موجود' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfferDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.offersService.update(id, dto, image);
  }

  // ─── Delete (Admin Only) ─────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] حذف عرض' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'تم حذف العرض بنجاح' })
  @ApiResponse({ status: 403, description: 'ليس لديك صلاحية' })
  @ApiResponse({ status: 404, description: 'العرض غير موجود' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.remove(id);
  }
}
