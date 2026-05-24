import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service.js';
import {
  IFavorite,
  IPaginatedFavorites,
} from '../interfaces/favorites.interface.js';

const MENU_ITEM_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  images: {
    select: { id: true, url: true, order: true },
    orderBy: { order: 'asc' as const },
  },
} satisfies Prisma.MenuItemInclude;

@Injectable()
export class FavoritesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(raw: any): IFavorite {
    return {
      id: raw.id,
      userId: raw.userId,
      menuItemId: raw.menuItemId,
      createdAt: raw.createdAt,
      menuItem: {
        id: raw.menuItem.id,
        name: raw.menuItem.name,
        description: raw.menuItem.description,
        price: Number(raw.menuItem.price),
        hasDiscount: raw.menuItem.hasDiscount,
        discountPercentage:
          raw.menuItem.discountPercentage === null
            ? null
            : Number(raw.menuItem.discountPercentage),
        rating: Number(raw.menuItem.rating),
        isAvailable: raw.menuItem.isAvailable,
        category: raw.menuItem.category,
        images: raw.menuItem.images,
      },
    };
  }

  async findOne(userId: string, menuItemId: string): Promise<IFavorite | null> {
    const row = await this.prisma.favorite.findFirst({
      where: { userId, menuItemId },
      include: { menuItem: { include: MENU_ITEM_INCLUDE } },
    });
    return row ? this.map(row) : null;
  }

  async findAll(params: {
    userId: string;
    page: number;
    limit: number;
    search?: string;
  }): Promise<IPaginatedFavorites> {
    const { userId, page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.FavoriteWhereInput = {
      userId,
      ...(search && {
        menuItem: {
          name: { contains: search, mode: 'insensitive' },
        },
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.favorite.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { menuItem: { include: MENU_ITEM_INCLUDE } },
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return {
      data: rows.map((r) => this.map(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(userId: string, menuItemId: string): Promise<IFavorite> {
    const row = await this.prisma.favorite.create({
      data: { userId, menuItemId },
      include: { menuItem: { include: MENU_ITEM_INCLUDE } },
    });
    return this.map(row);
  }

  async delete(userId: string, menuItemId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({
      where: { userId, menuItemId },
    });
  }

  async deleteAll(userId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId } });
  }

  async exists(userId: string, menuItemId: string): Promise<boolean> {
    const count = await this.prisma.favorite.count({
      where: { userId, menuItemId },
    });
    return count > 0;
  }

  async menuItemExists(menuItemId: string): Promise<boolean> {
    const count = await this.prisma.menuItem.count({
      where: { id: menuItemId },
    });
    return count > 0;
  }
}
