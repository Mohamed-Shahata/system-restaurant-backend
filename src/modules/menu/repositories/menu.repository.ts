import { Injectable } from '@nestjs/common';
import { MenuItem, MenuItemImage, MenuCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service.js';
import { IPaginatedMenuItems } from '../interfaces/menu.interface.js';

export type MenuItemWithImages = MenuItem & { images: MenuItemImage[] };

@Injectable()
export class MenuRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ──────────────────────────────────────────────────────────────────

  async create(data: Prisma.MenuItemCreateInput): Promise<MenuItemWithImages> {
    return this.prisma.menuItem.create({
      data,
      include: { images: { orderBy: { order: 'asc' } } },
    });
  }

  // ─── Read ────────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<MenuItemWithImages | null> {
    return this.prisma.menuItem.findUnique({
      where: { id },
      include: { images: { orderBy: { order: 'asc' } } },
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    category?: MenuCategory;
    isAvailable?: boolean;
    search?: string;
  }): Promise<IPaginatedMenuItems> {
    const { page, limit, category, isAvailable, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.MenuItemWhereInput = {
      ...(category && { category }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.menuItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { images: { orderBy: { order: 'asc' } } },
      }),
      this.prisma.menuItem.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        ...item,
        price: Number(item.price),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async update(
    id: string,
    data: Prisma.MenuItemUpdateInput,
  ): Promise<MenuItemWithImages> {
    return this.prisma.menuItem.update({
      where: { id },
      data,
      include: { images: { orderBy: { order: 'asc' } } },
    });
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    await this.prisma.menuItem.delete({ where: { id } });
  }

  // ─── Images ──────────────────────────────────────────────────────────────────

  async addImages(
    menuItemId: string,
    images: { url: string; publicId: string; order: number }[],
  ): Promise<void> {
    await this.prisma.menuItemImage.createMany({
      data: images.map((img) => ({ menuItemId, ...img })),
    });
  }

  async deleteImage(imageId: string): Promise<MenuItemImage | null> {
    return this.prisma.menuItemImage.delete({ where: { id: imageId } });
  }

  async findImageById(imageId: string): Promise<MenuItemImage | null> {
    return this.prisma.menuItemImage.findUnique({ where: { id: imageId } });
  }

  async deleteAllImages(menuItemId: string): Promise<MenuItemImage[]> {
    const images = await this.prisma.menuItemImage.findMany({
      where: { menuItemId },
    });
    await this.prisma.menuItemImage.deleteMany({ where: { menuItemId } });
    return images;
  }
}
