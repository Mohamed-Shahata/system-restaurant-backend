import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorator/current-user.decorator';
import type { IUser } from '../user/interfaces/user.interface';

import { FavoritesService } from './favorites.service';
import { QueryFavoritesDto } from './dto/query-favorites.dto';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':menuItemId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a menu item to favorites' })
  @ApiParam({ name: 'menuItemId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Item added to favorites' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  @ApiResponse({ status: 409, description: 'Item is already in favorites' })
  add(
    @CurrentUser() user: IUser,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
  ) {
    return this.favoritesService.add(user.id, menuItemId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all favorites for the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of favorites' })
  findAll(@CurrentUser() user: IUser, @Query() query: QueryFavoritesDto) {
    return this.favoritesService.findAll(user.id, query);
  }

  @Get(':menuItemId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if a menu item is in favorites' })
  @ApiParam({ name: 'menuItemId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: '{ isFavorite: boolean }' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  isFavorite(
    @CurrentUser() user: IUser,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
  ) {
    return this.favoritesService.isFavorite(user.id, menuItemId);
  }

  @Delete('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all favorites for the current user' })
  @ApiResponse({ status: 200, description: 'All favorites cleared' })
  removeAll(@CurrentUser() user: IUser) {
    return this.favoritesService.removeAll(user.id);
  }

  @Delete(':menuItemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a menu item from favorites' })
  @ApiParam({ name: 'menuItemId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Item removed from favorites' })
  @ApiResponse({ status: 404, description: 'Item not found in favorites' })
  remove(
    @CurrentUser() user: IUser,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
  ) {
    return this.favoritesService.remove(user.id, menuItemId);
  }
}
