export interface Product {
  id: string;
  name: string;
  price: number;
  basePrice?: number; // Original price before B2B discount
  image: string;
  description: string;
  category: string;
  stock?: number;
  rating?: number | null;
  reviewCount?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}
