import { Injectable } from '@nestjs/common';
import { Category, MenuItem, MenuItemImage, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { IPaginatedMenuItems } from '../interfaces/menu.interface';

export type MenuItemWithImages = MenuItem & {
  category: Category;
  images: MenuItemImage[];
};

const menuItemInclude = {
  category: true,
  images: { orderBy: { order: 'asc' } },
} satisfies Prisma.MenuItemInclude;

@Injectable()
export class MenuRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ──────────────────────────────────────────────────────────────────

  async create(data: Prisma.MenuItemCreateInput): Promise<MenuItemWithImages> {
    return this.prisma.menuItem.create({
      data,
      include: menuItemInclude,
    });
  }

  // ─── Read ────────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<MenuItemWithImages | null> {
    return this.prisma.menuItem.findUnique({
      where: { id },
      include: menuItemInclude,
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    categoryId?: string;
    isAvailable?: boolean;
    search?: string;
  }): Promise<IPaginatedMenuItems> {
    const { page, limit, categoryId, isAvailable, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.MenuItemWhereInput = {
      ...(categoryId && { categoryId }),
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
        include: menuItemInclude,
      }),
      this.prisma.menuItem.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        ...item,
        price: Number(item.price),
        discountPercentage:
          item.discountPercentage === null
            ? null
            : Number(item.discountPercentage),
        rating: Number(item.rating),
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
      include: menuItemInclude,
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
