import { Injectable } from '@nestjs/common';
import { MenuItemSize, Prisma, SizeLabel } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class SizesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: MenuItemSize) {
    return { ...row, price: Number(row.price) };
  }

  async create(data: Prisma.MenuItemSizeCreateInput) {
    const row = await this.prisma.menuItemSize.create({ data });
    return this.map(row);
  }

  async findAllByMenuItem(menuItemId: string) {
    const rows = await this.prisma.menuItemSize.findMany({
      where: { menuItemId },
      orderBy: { label: 'asc' },
    });
    return rows.map((r) => this.map(r));
  }

  async findById(id: string): Promise<MenuItemSize | null> {
    return this.prisma.menuItemSize.findUnique({ where: { id } });
  }

  async findByMenuItemAndLabel(
    menuItemId: string,
    label: SizeLabel,
  ): Promise<MenuItemSize | null> {
    return this.prisma.menuItemSize.findFirst({ where: { menuItemId, label } });
  }

  async update(id: string, data: Prisma.MenuItemSizeUpdateInput) {
    const row = await this.prisma.menuItemSize.update({ where: { id }, data });
    return this.map(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.menuItemSize.delete({ where: { id } });
  }

  async menuItemExists(menuItemId: string): Promise<boolean> {
    const count = await this.prisma.menuItem.count({ where: { id: menuItemId } });
    return count > 0;
  }
}
