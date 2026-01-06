export interface Product {
  id: string;
  name: string;
  price: number;
  basePrice?: number; // Original price before B2B discount
  image: string;
  description: string;
  category: string;
  stock?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
