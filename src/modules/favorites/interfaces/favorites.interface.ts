export interface IFavoriteMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discountPercentage: number | null;
  hasDiscount: boolean;
  rating: number;
  isAvailable: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  images: {
    id: string;
    url: string;
    order: number;
  }[];
}

export interface IFavorite {
  id: string;
  userId: string;
  menuItemId: string;
  createdAt: Date;
  menuItem: IFavoriteMenuItem;
}

export interface IPaginatedFavorites {
  data: IFavorite[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
