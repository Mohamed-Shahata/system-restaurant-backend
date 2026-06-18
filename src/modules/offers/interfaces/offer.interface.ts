export interface IOfferMenuItem {
  id: string;
  name: string;
  isAvailable: boolean;
  image: string | null;
}

export interface IOfferItem {
  id: string;
  menuItemId: string;
  quantity: number;
  menuItem: IOfferMenuItem;
}

export interface IOffer {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image: string | null;
  imagePublicId: string | null;
  isAvailable: boolean;
  items: IOfferItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaginatedOffers {
  data: IOffer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
