import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service';
import {
  ok,
  paginated,
  ApiResponse,
  PaginatedApiResponse,
} from '../../shared/response/api-response';
import { CreateOfferDto } from './dto/create-offer.dto';
import { QueryOffersDto } from './dto/query-offers.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { IOffer, IPaginatedOffers } from './interfaces/offer.interface';
import { OffersRepository } from './repositories/offers.repository';

const OFFER_IMAGE_FOLDER = 'restaurant/offers';

@Injectable()
export class OffersService {
  constructor(
    private readonly offersRepository: OffersRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    dto: CreateOfferDto,
    imageFile?: Express.Multer.File,
  ): Promise<ApiResponse<IOffer>> {
    const menuItemIds = this.dedupe(dto.menuItemIds);
    await this.ensureMenuItemsExist(menuItemIds);

    let image: { url: string; publicId: string } | null = null;
    if (imageFile) {
      image = await this.cloudinaryService.uploadImage(
        imageFile.buffer,
        OFFER_IMAGE_FOLDER,
      );
    }

    const offer = await this.offersRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      price: dto.price,
      isAvailable: dto.isAvailable,
      imageUrl: image?.url ?? null,
      imagePublicId: image?.publicId ?? null,
      menuItemIds,
    });

    return ok(offer, 'Offer created successfully');
  }

  async findAll(query: QueryOffersDto): Promise<PaginatedApiResponse<IOffer>> {
    const result: IPaginatedOffers = await this.offersRepository.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      isAvailable: query.isAvailable,
    });

    return paginated(result.data, result.meta, 'Offers retrieved successfully');
  }

  async findOne(id: string): Promise<ApiResponse<IOffer>> {
    const offer = await this.offersRepository.findById(id);
    if (!offer) throw new NotFoundException(`Offer ${id} not found`);
    return ok(offer, 'Offer retrieved successfully');
  }

  async update(
    id: string,
    dto: UpdateOfferDto,
    imageFile?: Express.Multer.File,
  ): Promise<ApiResponse<IOffer>> {
    const existing = await this.offersRepository.findById(id);
    if (!existing) throw new NotFoundException(`Offer ${id} not found`);

    const menuItemIds = dto.menuItemIds
      ? this.dedupe(dto.menuItemIds)
      : undefined;

    if (menuItemIds) await this.ensureMenuItemsExist(menuItemIds);

    let imagePatch: { imageUrl?: string; imagePublicId?: string } = {};
    if (imageFile) {
      if (existing.imagePublicId) {
        await this.cloudinaryService.deleteImage(existing.imagePublicId);
      }
      const uploaded = await this.cloudinaryService.uploadImage(
        imageFile.buffer,
        OFFER_IMAGE_FOLDER,
      );
      imagePatch = { imageUrl: uploaded.url, imagePublicId: uploaded.publicId };
    }

    await this.offersRepository.update(id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
      ...imagePatch,
    });

    if (menuItemIds) {
      await this.offersRepository.replaceItems(id, menuItemIds);
    }

    const full = await this.offersRepository.findById(id);
    return ok(full!, 'Offer updated successfully');
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    const existing = await this.offersRepository.findById(id);
    if (!existing) throw new NotFoundException(`Offer ${id} not found`);

    if (existing.imagePublicId) {
      await this.cloudinaryService.deleteImage(existing.imagePublicId);
    }

    await this.offersRepository.delete(id);
    return ok(null, 'Offer deleted successfully');
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private dedupe(ids: string[]): string[] {
    return Array.from(new Set(ids));
  }

  private async ensureMenuItemsExist(menuItemIds: string[]): Promise<void> {
    const allExist = await this.offersRepository.menuItemsExist(menuItemIds);
    if (!allExist) {
      throw new BadRequestException(
        'One or more of the provided menu items were not found',
      );
    }
  }
}
