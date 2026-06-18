export interface ICartAddon {
  id: string;
  addonId: string;
  name: string;
  price: number;
}

export interface ICartItem {
  id: string;
  cartId: string;
  menuItemId: string;
  quantity: number;
  note: string | null;
  unitPrice: number;
  totalPrice: number;
  menuItem: {
    id: string;
    name: string;
    isAvailable: boolean;
    images: { id: string; url: string; order: number }[];
  };
  size: {
    id: string;
    slug: string;
    label: string;
    price: number;
  } | null;
  addons: ICartAddon[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICart {
  id: string;
  userId: string;
  items: ICartItem[];
  subtotal: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}
