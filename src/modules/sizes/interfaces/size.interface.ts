import { SizeLabel } from '@prisma/client';

export interface ISize {
  id: string;
  menuItemId: string;
  label: SizeLabel;
  price: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}
