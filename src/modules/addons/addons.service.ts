import { Injectable, NotFoundException } from '@nestjs/common';
import { ok } from '../../shared/response/api-response';
import { CreateAddonDto } from './dto/create-addon.dto';
import { UpdateAddonDto } from './dto/update-addon.dto';
import { AddonsRepository } from './repositories/addons.repository';

@Injectable()
export class AddonsService {
  constructor(private readonly addonsRepository: AddonsRepository) {}

  async create(dto: CreateAddonDto) {
    const exists = await this.addonsRepository.menuItemExists(dto.menuItemId);
    if (!exists) throw new NotFoundException(`Menu item ${dto.menuItemId} not found`);

    const addon = await this.addonsRepository.create({
      name: dto.name,
      price: dto.price,
      menuItem: { connect: { id: dto.menuItemId } },
    });
    return ok(addon, 'Addon created successfully');
  }

  async findAllByMenuItem(menuItemId: string) {
    const exists = await this.addonsRepository.menuItemExists(menuItemId);
    if (!exists) throw new NotFoundException(`Menu item ${menuItemId} not found`);

    const addons = await this.addonsRepository.findAllByMenuItem(menuItemId);
    return ok(addons, 'Addons retrieved successfully');
  }

  async findOne(id: string) {
    const addon = await this.addonsRepository.findById(id);
    if (!addon) throw new NotFoundException(`Addon ${id} not found`);
    return ok({ ...addon, price: Number(addon.price) }, 'Addon retrieved successfully');
  }

  async update(id: string, dto: UpdateAddonDto) {
    const addon = await this.addonsRepository.findById(id);
    if (!addon) throw new NotFoundException(`Addon ${id} not found`);

    const updated = await this.addonsRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.price !== undefined && { price: dto.price }),
    });
    return ok(updated, 'Addon updated successfully');
  }

  async remove(id: string) {
    const addon = await this.addonsRepository.findById(id);
    if (!addon) throw new NotFoundException(`Addon ${id} not found`);

    await this.addonsRepository.delete(id);
    return ok(null, 'Addon deleted successfully');
  }
}
