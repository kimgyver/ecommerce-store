"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/products";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();

  const handleAddToCart = async () => {
    try {
      setError(null);
      setIsAdding(true);
      await addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image
      });
      // Reset button after 1 second on success
      setTimeout(() => setIsAdding(false), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to cart");
      setIsAdding(false);
      console.error("Error adding to cart:", err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      <Link href={`/products/${product.id}`}>
        <div className="relative w-full h-48 bg-gray-200">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover hover:scale-105 transition"
          />
        </div>
      </Link>
      <div className="p-4">
        <p className="text-sm text-gray-500">{product.category}</p>
        <Link href={`/products/${product.id}`}>
          <h3 className="text-lg font-semibold mt-2 hover:text-blue-600 transition">
            {product.name}
          </h3>
        </Link>
        <p className="text-gray-600 text-sm mt-2 line-clamp-2">
          {product.description}
        </p>
        <div className="flex justify-between items-center mt-4">
          <span className="text-xl font-bold text-blue-600">
            ${product.price.toLocaleString("en-US")}
          </span>
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className={`px-4 py-2 rounded text-white font-semibold transition ${
              isAdding
                ? "bg-green-600 cursor-default"
                : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
            }`}
          >
            {isAdding ? "Adding..." : "Add to Cart"}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>
    </div>
  );
}
