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

import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorator/current-user.decorator';
import type { IUser } from '../user/interfaces/user.interface';

import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the current user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  getCart(@CurrentUser() user: IUser) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an item to the cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid size or addon for this menu item',
  })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  addItem(@CurrentUser() user: IUser, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:cartItemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a cart item (quantity, size, addons, note)',
  })
  @ApiParam({ name: 'cartItemId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid size or addon for this menu item',
  })
  @ApiResponse({ status: 403, description: 'Cart item not found' })
  updateItem(
    @CurrentUser() user: IUser,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, cartItemId, dto);
  }

  @Delete('items/:cartItemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a specific item from the cart' })
  @ApiParam({ name: 'cartItemId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Item removed from cart successfully',
  })
  @ApiResponse({ status: 403, description: 'Cart item not found' })
  removeItem(
    @CurrentUser() user: IUser,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
  ) {
    return this.cartService.removeItem(user.id, cartItemId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from the cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  clearCart(@CurrentUser() user: IUser) {
    return this.cartService.clearCart(user.id);
  }
}
