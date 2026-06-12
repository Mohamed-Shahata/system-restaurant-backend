import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ICart, ICartItem } from '../interfaces/cart.interface';

// ─── Shared include shape ─────────────────────────────────────────────────────

const CART_ITEM_INCLUDE = {
  menuItem: {
    select: {
      id: true,
      name: true,
      price: true,
      isAvailable: true,
      images: {
        select: { id: true, url: true, order: true },
        orderBy: { order: 'asc' as const },
      },
    },
  },
  size: {
    select: { id: true, label: true, price: true },
  },
  addons: {
    select: {
      id: true,
      addonId: true,
      addon: { select: { name: true, price: true } },
    },
  },
} satisfies Prisma.CartItemInclude;

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapCartItem(raw: any): ICartItem {
  const basePrice = Number(raw.menuItem.price);
  const sizePrice = raw.size ? Number(raw.size.price) : 0;
  const addonsPrice = raw.addons.reduce(
    (sum: number, a: any) => sum + Number(a.addon.price),
    0,
  );
  const unitPrice = basePrice + sizePrice + addonsPrice;

  return {
    id: raw.id,
    cartId: raw.cartId,
    menuItemId: raw.menuItemId,
    quantity: raw.quantity,
    note: raw.note,
    unitPrice,
    totalPrice: unitPrice * raw.quantity,
    menuItem: {
      id: raw.menuItem.id,
      name: raw.menuItem.name,
      price: basePrice,
      isAvailable: raw.menuItem.isAvailable,
      images: raw.menuItem.images,
    },
    size: raw.size
      ? {
          id: raw.size.id,
          label: raw.size.label,
          price: Number(raw.size.price),
        }
      : null,
    addons: raw.addons.map((a: any) => ({
      id: a.id,
      addonId: a.addonId,
      name: a.addon.name,
      price: Number(a.addon.price),
    })),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function mapCart(raw: any): ICart {
  const items = raw.items.map(mapCartItem);
  const subtotal = items.reduce(
    (sum: number, item: ICartItem) => sum + item.totalPrice,
    0,
  );
  return {
    id: raw.id,
    userId: raw.userId,
    items,
    subtotal,
    itemCount: items.length,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Cart ──────────────────────────────────────────────────────────────────

  async findCartByUserId(userId: string): Promise<ICart | null> {
    const row = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: CART_ITEM_INCLUDE, orderBy: { createdAt: 'asc' } },
      },
    });
    return row ? mapCart(row) : null;
  }

  async getOrCreateCart(userId: string): Promise<ICart> {
    const existing = await this.findCartByUserId(userId);
    if (existing) return existing;

    const row = await this.prisma.cart.create({
      data: { userId },
      include: { items: { include: CART_ITEM_INCLUDE } },
    });
    return mapCart(row);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) return;
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  // ── CartItem ──────────────────────────────────────────────────────────────

  async addItem(
    cartId: string,
    data: {
      menuItemId: string;
      sizeId?: string;
      addonIds?: string[];
      quantity: number;
      note?: string;
    },
  ): Promise<ICartItem> {
    const row = await this.prisma.cartItem.create({
      data: {
        cartId,
        menuItemId: data.menuItemId,
        sizeId: data.sizeId ?? null,
        quantity: data.quantity,
        note: data.note ?? null,
        addons: data.addonIds?.length
          ? { create: data.addonIds.map((addonId) => ({ addonId })) }
          : undefined,
      },
      include: CART_ITEM_INCLUDE,
    });
    return mapCartItem(row);
  }

  async findItemById(cartItemId: string): Promise<ICartItem | null> {
    const row = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: CART_ITEM_INCLUDE,
    });
    return row ? mapCartItem(row) : null;
  }

  async updateItem(
    cartItemId: string,
    data: {
      sizeId?: string | null;
      addonIds?: string[];
      quantity?: number;
      note?: string | null;
    },
  ): Promise<ICartItem> {
    // Replace addons atomically when addonIds is provided
    if (data.addonIds !== undefined) {
      await this.prisma.cartItemAddon.deleteMany({ where: { cartItemId } });
      if (data.addonIds.length) {
        await this.prisma.cartItemAddon.createMany({
          data: data.addonIds.map((addonId) => ({ cartItemId, addonId })),
        });
      }
    }

    const row = await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        ...(data.sizeId !== undefined && { sizeId: data.sizeId }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.note !== undefined && { note: data.note }),
      },
      include: CART_ITEM_INCLUDE,
    });
    return mapCartItem(row);
  }

  async removeItem(cartItemId: string): Promise<void> {
    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async menuItemExists(menuItemId: string): Promise<boolean> {
    const count = await this.prisma.menuItem.count({
      where: { id: menuItemId },
    });
    return count > 0;
  }

  async sizeExistsForItem(
    sizeId: string,
    menuItemId: string,
  ): Promise<boolean> {
    const count = await this.prisma.menuItemSize.count({
      where: { id: sizeId, menuItemId, isAvailable: true },
    });
    return count > 0;
  }

  async allAddonsExistForItem(
    addonIds: string[],
    menuItemId: string,
  ): Promise<boolean> {
    const count = await this.prisma.menuItemAddon.count({
      where: { id: { in: addonIds }, menuItemId },
    });
    return count === addonIds.length;
  }

  async itemBelongsToUser(
    cartItemId: string,
    userId: string,
  ): Promise<boolean> {
    const count = await this.prisma.cartItem.count({
      where: { id: cartItemId, cart: { userId } },
    });
    return count > 0;
  }
}
