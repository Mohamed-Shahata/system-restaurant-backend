export interface ICategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMenuItemImage {
  id: string;
  menuItemId: string;
  url: string;
  publicId: string;
  order: number;
  createdAt: Date;
}

export interface IMenuItemAddon {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMenuItemSize {
  id: string;
  menuItemId: string;
  slug: string;
  label: string;
  price: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMenuItem {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  category: ICategory;
  isAvailable: boolean;
  hasDiscount: boolean;
  discountPercentage: number | null;
  rating: number;
  images: IMenuItemImage[];
  addons: IMenuItemAddon[];
  sizes: IMenuItemSize[];
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

export interface IMenuRepository {
  create(
    data: Omit<
      IMenuItem,
      'id' | 'images' | 'addons' | 'sizes' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<IMenuItem>;
  findById(id: string): Promise<IMenuItem | null>;
  findAll(params: {
    page: number;
    limit: number;
    categoryId?: string;
    isAvailable?: boolean;
    search?: string;
  }): Promise<IPaginatedMenuItems>;
  update(
    id: string,
    data: Partial<
      Omit<
        IMenuItem,
        'id' | 'images' | 'addons' | 'sizes' | 'createdAt' | 'updatedAt'
      >
    >,
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
