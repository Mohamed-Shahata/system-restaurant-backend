import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { IOffer, IPaginatedOffers } from '../interfaces/offer.interface';

// ─── Shared include shape ─────────────────────────────────────────────────────
const OFFER_INCLUDE = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      menuItem: {
        select: {
          id: true,
          name: true,
          isAvailable: true,
          images: {
            select: { url: true },
            orderBy: { order: 'asc' as const },
            take: 1,
          },
        },
      },
    },
  },
} satisfies Prisma.OfferInclude;

type OfferWithRelations = Prisma.OfferGetPayload<{
  include: typeof OFFER_INCLUDE;
}>;

// ─── Mapper ───────────────────────────────────────────────────────────────────
function mapOffer(raw: OfferWithRelations): IOffer {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    price: Number(raw.price),
    image: raw.imageUrl,
    imagePublicId: raw.imagePublicId,
    isAvailable: raw.isAvailable,
    items: raw.items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      menuItem: {
        id: item.menuItem.id,
        name: item.menuItem.name,
        isAvailable: item.menuItem.isAvailable,
        image: item.menuItem.images[0]?.url ?? null,
      },
    })),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

@Injectable()
export class OffersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    title: string;
    description?: string | null;
    price: number;
    isAvailable?: boolean;
    imageUrl?: string | null;
    imagePublicId?: string | null;
    menuItemIds: string[];
  }): Promise<IOffer> {
    const row = await this.prisma.offer.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        price: data.price,
        isAvailable: data.isAvailable ?? true,
        imageUrl: data.imageUrl ?? null,
        imagePublicId: data.imagePublicId ?? null,
        items: {
          create: data.menuItemIds.map((menuItemId) => ({ menuItemId })),
        },
      },
      include: OFFER_INCLUDE,
    });
    return mapOffer(row);
  }

  async findById(id: string): Promise<IOffer | null> {
    const row = await this.prisma.offer.findUnique({
      where: { id },
      include: OFFER_INCLUDE,
    });
    return row ? mapOffer(row) : null;
  }

  async findAll(params: {
    page: number;
    limit: number;
    isAvailable?: boolean;
  }): Promise<IPaginatedOffers> {
    const { page, limit, isAvailable } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.OfferWhereInput = {
      ...(isAvailable !== undefined && { isAvailable }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.offer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: OFFER_INCLUDE,
      }),
      this.prisma.offer.count({ where }),
    ]);

    return {
      data: rows.map((r) => mapOffer(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      price?: number;
      isAvailable?: boolean;
      imageUrl?: string | null;
      imagePublicId?: string | null;
    },
  ): Promise<IOffer> {
    const row = await this.prisma.offer.update({
      where: { id },
      data,
      include: OFFER_INCLUDE,
    });
    return mapOffer(row);
  }

  /** يستبدل قائمة الوجبات المرتبطة بالعرض بالكامل */
  async replaceItems(offerId: string, menuItemIds: string[]): Promise<IOffer> {
    await this.prisma.$transaction([
      this.prisma.offerItem.deleteMany({ where: { offerId } }),
      this.prisma.offerItem.createMany({
        data: menuItemIds.map((menuItemId) => ({ offerId, menuItemId })),
      }),
    ]);

    const row = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: OFFER_INCLUDE,
    });
    return mapOffer(row!);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.offer.delete({ where: { id } });
  }

  /** يتأكد إن كل الـ IDs دي بتخص وجبات موجودة فعلاً */
  async menuItemsExist(menuItemIds: string[]): Promise<boolean> {
    if (menuItemIds.length === 0) return true;
    const count = await this.prisma.menuItem.count({
      where: { id: { in: menuItemIds } },
    });
    return count === menuItemIds.length;
  }
}
