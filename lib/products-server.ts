"use server";

import { prisma } from "@/lib/prisma";
import { Product } from "@/lib/products";

export async function getProducts(): Promise<Product[]> {
  try {
    const products = await prisma.product.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });
    return products;
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const product = await prisma.product.findUnique({
      where: { id }
    });
    return product;
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return null;
  }
}

export async function getProductsByCategory(
  category: string
): Promise<Product[]> {
  try {
    const products = await prisma.product.findMany({
      where: { category },
      orderBy: {
        createdAt: "desc"
      }
    });
    return products;
  } catch (error) {
    console.error("Failed to fetch products by category:", error);
    return [];
  }
}
