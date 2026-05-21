import { MenuCategory } from '@prisma/client';

// Re-export so the rest of the app can import from one place
export { MenuCategory };

// ─── Core interfaces ──────────────────────────────────────────────────────────
export interface IMenuItemImage {
  id: string;
  menuItemId: string;
  url: string;
  publicId: string;
  order: number;
  createdAt: Date;
}

export interface IMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: MenuCategory;
  isAvailable: boolean;
  hasDiscount: boolean;
  discountPercentage: number | null;
  rating: number;
  images: IMenuItemImage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaginatedMenuItems {
  data: IMenuItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Repository contract ──────────────────────────────────────────────────────
export interface IMenuRepository {
  create(
    data: Omit<IMenuItem, 'id' | 'images' | 'createdAt' | 'updatedAt'>,
  ): Promise<IMenuItem>;
  findById(id: string): Promise<IMenuItem | null>;
  findAll(params: {
    page: number;
    limit: number;
    category?: MenuCategory;
    isAvailable?: boolean;
    search?: string;
  }): Promise<IPaginatedMenuItems>;
  update(
    id: string,
    data: Partial<Omit<IMenuItem, 'id' | 'images' | 'createdAt' | 'updatedAt'>>,
  ): Promise<IMenuItem>;
  delete(id: string): Promise<void>;
  addImages(
    menuItemId: string,
    images: { url: string; publicId: string; order: number }[],
  ): Promise<void>;
  deleteImage(imageId: string): Promise<IMenuItemImage | null>;
  findImageById(imageId: string): Promise<IMenuItemImage | null>;
  deleteAllImages(menuItemId: string): Promise<IMenuItemImage[]>;
}
