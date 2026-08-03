import { Injectable } from '@nestjs/common';
import { MenuItemSize, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class SizesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: MenuItemSize) {
    return { ...row, price: Number(row.price) };
  }

  async create(
    data: Prisma.MenuItemSizeCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const row = await client.menuItemSize.create({ data });
    return this.map(row);
  }

  async findAllByMenuItem(menuItemId: string) {
    const rows = await this.prisma.menuItemSize.findMany({
      where: { menuItemId },
      orderBy: { slug: 'asc' },
    });
    return rows.map((r) => this.map(r));
  }

  async findById(id: string): Promise<MenuItemSize | null> {
    return this.prisma.menuItemSize.findUnique({ where: { id } });
  }

  async findByMenuItemAndSlug(
    menuItemId: string,
    slug: string,
  ): Promise<MenuItemSize | null> {
    return this.prisma.menuItemSize.findFirst({ where: { menuItemId, slug } });
  }

  async update(id: string, data: Prisma.MenuItemSizeUpdateInput) {
    const row = await this.prisma.menuItemSize.update({ where: { id }, data });
    return this.map(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.menuItemSize.delete({ where: { id } });
  }

  async menuItemExists(menuItemId: string): Promise<boolean> {
    const count = await this.prisma.menuItem.count({
      where: { id: menuItemId },
    });
    return count > 0;
  }
}
