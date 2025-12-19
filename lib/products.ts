export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  stock?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
