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

import { AddonsService } from './addons.service';
import { CreateAddonDto } from './dto/create-addon.dto';
import { UpdateAddonDto } from './dto/update-addon.dto';

@ApiTags('Addons')
@Controller('addons')
export class AddonsController {
  constructor(private readonly addonsService: AddonsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Add an addon to a menu item' })
  @ApiResponse({ status: 201, description: 'Addon created successfully' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  create(@Body() dto: CreateAddonDto) {
    return this.addonsService.create(dto);
  }

  @Get('menu-item/:menuItemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all addons for a menu item' })
  @ApiParam({ name: 'menuItemId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of addons' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  findAllByMenuItem(@Param('menuItemId', ParseUUIDPipe) menuItemId: string) {
    return this.addonsService.findAllByMenuItem(menuItemId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single addon by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Addon details' })
  @ApiResponse({ status: 404, description: 'Addon not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.addonsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Update an addon' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Addon updated successfully' })
  @ApiResponse({ status: 404, description: 'Addon not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddonDto,
  ) {
    return this.addonsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Delete an addon' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Addon deleted successfully' })
  @ApiResponse({ status: 404, description: 'Addon not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.addonsService.remove(id);
  }
}
