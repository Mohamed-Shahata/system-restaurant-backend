import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ok } from '../../shared/response/api-response';
import { CartRepository } from './repositories/cart.repository';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly cartRepository: CartRepository) {}

  // ── Get cart ──────────────────────────────────────────────────────────────

  async getCart(userId: string) {
    const cart = await this.cartRepository.getOrCreateCart(userId);
    return ok(cart, 'Cart retrieved successfully');
  }

  // ── Add item ──────────────────────────────────────────────────────────────

  async addItem(userId: string, dto: AddCartItemDto) {
    // Validate menu item exists
    const itemExists = await this.cartRepository.menuItemExists(dto.menuItemId);
    if (!itemExists) {
      throw new NotFoundException(`Menu item ${dto.menuItemId} not found`);
    }

    // Validate size belongs to this menu item
    if (dto.sizeId) {
      const sizeValid = await this.cartRepository.sizeExistsForItem(
        dto.sizeId,
        dto.menuItemId,
      );
      if (!sizeValid) {
        throw new BadRequestException(
          `Size ${dto.sizeId} is not available for this menu item`,
        );
      }
    }

    // Validate all addons belong to this menu item
    if (dto.addonIds?.length) {
      const addonsValid = await this.cartRepository.allAddonsExistForItem(
        dto.addonIds,
        dto.menuItemId,
      );
      if (!addonsValid) {
        throw new BadRequestException(
          'One or more addons are invalid for this menu item',
        );
      }
    }

    const cart = await this.cartRepository.getOrCreateCart(userId);
    const cartItem = await this.cartRepository.addItem(cart.id, {
      menuItemId: dto.menuItemId,
      sizeId: dto.sizeId,
      addonIds: dto.addonIds,
      quantity: dto.quantity ?? 1,
      note: dto.note,
    });

    return ok(cartItem, 'Item added to cart successfully');
  }

  // ── Update item ───────────────────────────────────────────────────────────

  async updateItem(userId: string, cartItemId: string, dto: UpdateCartItemDto) {
    // Ensure the item belongs to this user's cart
    const belongs = await this.cartRepository.itemBelongsToUser(
      cartItemId,
      userId,
    );
    if (!belongs) throw new ForbiddenException('Cart item not found');

    const cartItem = await this.cartRepository.findItemById(cartItemId);
    if (!cartItem) throw new NotFoundException('Cart item not found');

    // Validate size if being updated
    if (dto.sizeId) {
      const sizeValid = await this.cartRepository.sizeExistsForItem(
        dto.sizeId,
        cartItem.menuItemId,
      );
      if (!sizeValid) {
        throw new BadRequestException(
          `Size ${dto.sizeId} is not available for this menu item`,
        );
      }
    }

    // Validate addons if being updated
    if (dto.addonIds?.length) {
      const addonsValid = await this.cartRepository.allAddonsExistForItem(
        dto.addonIds,
        cartItem.menuItemId,
      );
      if (!addonsValid) {
        throw new BadRequestException(
          'One or more addons are invalid for this menu item',
        );
      }
    }

    const updated = await this.cartRepository.updateItem(cartItemId, {
      sizeId: dto.sizeId,
      addonIds: dto.addonIds,
      quantity: dto.quantity,
      note: dto.note,
    });

    return ok(updated, 'Cart item updated successfully');
  }

  // ── Remove item ───────────────────────────────────────────────────────────

  async removeItem(userId: string, cartItemId: string) {
    const belongs = await this.cartRepository.itemBelongsToUser(
      cartItemId,
      userId,
    );
    if (!belongs) throw new ForbiddenException('Cart item not found');

    await this.cartRepository.removeItem(cartItemId);
    return ok(null, 'Item removed from cart successfully');
  }

  // ── Clear cart ────────────────────────────────────────────────────────────

  async clearCart(userId: string) {
    await this.cartRepository.clearCart(userId);
    return ok(null, 'Cart cleared successfully');
  }
}
