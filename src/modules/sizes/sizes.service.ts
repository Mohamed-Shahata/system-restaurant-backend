import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ok } from '../../shared/response/api-response';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { SizesRepository } from './repositories/sizes.repository';

@Injectable()
export class SizesService {
  constructor(private readonly sizesRepository: SizesRepository) {}

  async create(dto: CreateSizeDto) {
    const exists = await this.sizesRepository.menuItemExists(dto.menuItemId);
    if (!exists) throw new NotFoundException(`Menu item ${dto.menuItemId} not found`);

    const duplicate = await this.sizesRepository.findByMenuItemAndSlug(
      dto.menuItemId,
      dto.slug,
    );
    if (duplicate)
      throw new ConflictException(
        `Size "${dto.slug}" already exists for this menu item`,
      );

    const size = await this.sizesRepository.create({
      slug: dto.slug,
      label: dto.label,
      price: dto.price,
      isAvailable: dto.isAvailable ?? true,
      menuItem: { connect: { id: dto.menuItemId } },
    });
    return ok(size, 'Size created successfully');
  }

  async findAllByMenuItem(menuItemId: string) {
    const exists = await this.sizesRepository.menuItemExists(menuItemId);
    if (!exists) throw new NotFoundException(`Menu item ${menuItemId} not found`);

    const sizes = await this.sizesRepository.findAllByMenuItem(menuItemId);
    return ok(sizes, 'Sizes retrieved successfully');
  }

  async findOne(id: string) {
    const size = await this.sizesRepository.findById(id);
    if (!size) throw new NotFoundException(`Size ${id} not found`);
    return ok({ ...size, price: Number(size.price) }, 'Size retrieved successfully');
  }

  async update(id: string, dto: UpdateSizeDto) {
    const size = await this.sizesRepository.findById(id);
    if (!size) throw new NotFoundException(`Size ${id} not found`);

    const updated = await this.sizesRepository.update(id, {
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.isAvailable !== undefined && { isAvailable: dto.isAvailable }),
    });
    return ok(updated, 'Size updated successfully');
  }

  async remove(id: string) {
    const size = await this.sizesRepository.findById(id);
    if (!size) throw new NotFoundException(`Size ${id} not found`);

    await this.sizesRepository.delete(id);
    return ok(null, 'Size deleted successfully');
  }
}
