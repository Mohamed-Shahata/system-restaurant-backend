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

import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorator/roles.decorator';

import { SizesService } from './sizes.service';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';

@ApiTags('Sizes')
@Controller('sizes')
export class SizesController {
  constructor(private readonly sizesService: SizesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Add a size to a menu item' })
  @ApiResponse({ status: 201, description: 'Size created successfully' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  @ApiResponse({ status: 409, description: 'Size label already exists for this item' })
  create(@Body() dto: CreateSizeDto) {
    return this.sizesService.create(dto);
  }

  @Get('menu-item/:menuItemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all sizes for a menu item' })
  @ApiParam({ name: 'menuItemId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of sizes' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  findAllByMenuItem(@Param('menuItemId', ParseUUIDPipe) menuItemId: string) {
    return this.sizesService.findAllByMenuItem(menuItemId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single size by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Size details' })
  @ApiResponse({ status: 404, description: 'Size not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sizesService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Update a size (price or availability)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Size updated successfully' })
  @ApiResponse({ status: 404, description: 'Size not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSizeDto,
  ) {
    return this.sizesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Delete a size' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Size deleted successfully' })
  @ApiResponse({ status: 404, description: 'Size not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sizesService.remove(id);
  }
}
