import { Injectable } from '@nestjs/common';
import { MenuItemImage, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { IPaginatedMenuItems } from '../interfaces/menu.interface';

const menuItemInclude = {
  category: true,
  images: { orderBy: { order: 'asc' } },
  addons: { orderBy: { createdAt: 'asc' } },
  sizes: { orderBy: { label: 'asc' } },
} satisfies Prisma.MenuItemInclude;

export type MenuItemWithRelations = Prisma.MenuItemGetPayload<{
  include: typeof menuItemInclude;
}>;

@Injectable()
export class MenuRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.MenuItemCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<MenuItemWithRelations> {
    const client = tx ?? this.prisma;
    return await client.menuItem.create({
      data,
      include: menuItemInclude,
    });
  }

  async findById(id: string): Promise<MenuItemWithRelations | null> {
    return await this.prisma.menuItem.findUnique({
      where: { id },
      include: menuItemInclude,
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    category?: string;
    isAvailable?: boolean;
    search?: string;
  }): Promise<IPaginatedMenuItems> {
    const { page, limit, category, isAvailable, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.MenuItemWhereInput = {
      ...(category && { category: { slug: { equals: category } } }),
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
        discountPercentage:
          item.discountPercentage === null
            ? null
            : Number(item.discountPercentage),
        rating: Number(item.rating),
        addons: item.addons.map((a) => ({ ...a, price: Number(a.price) })),
        sizes: item.sizes.map((s) => ({ ...s, price: Number(s.price) })),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(
    id: string,
    data: Prisma.MenuItemUpdateInput,
  ): Promise<MenuItemWithRelations> {
    return await this.prisma.menuItem.update({
      where: { id },
      data,
      include: menuItemInclude,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.menuItem.delete({ where: { id } });
  }

  async addImages(
    menuItemId: string,
    images: { url: string; publicId: string; order: number }[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.menuItemImage.createMany({
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
