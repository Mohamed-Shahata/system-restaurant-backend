import { Injectable } from '@nestjs/common';
import { MenuItemAddon, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class AddonsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: MenuItemAddon) {
    return { ...row, price: Number(row.price) };
  }

  async create(data: Prisma.MenuItemAddonCreateInput) {
    const row = await this.prisma.menuItemAddon.create({ data });
    return this.map(row);
  }

  async findAllByMenuItem(menuItemId: string) {
    const rows = await this.prisma.menuItemAddon.findMany({
      where: { menuItemId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.map(r));
  }

  async findById(id: string): Promise<MenuItemAddon | null> {
    return this.prisma.menuItemAddon.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.MenuItemAddonUpdateInput) {
    const row = await this.prisma.menuItemAddon.update({ where: { id }, data });
    return this.map(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.menuItemAddon.delete({ where: { id } });
  }

  async menuItemExists(menuItemId: string): Promise<boolean> {
    const count = await this.prisma.menuItem.count({ where: { id: menuItemId } });
    return count > 0;
  }
}
