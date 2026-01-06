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
        <div
          className="relative w-full bg-gray-200 flex items-center justify-center p-2"
          style={{ aspectRatio: "1 / 1" }}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain hover:scale-105 transition"
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

        {/* Stock status */}
        <div className="mt-3">
          {(product.stock ?? 0) === 0 ? (
            <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded font-semibold">
              Out of Stock
            </span>
          ) : (product.stock ?? 0) <= 5 ? (
            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded font-semibold">
              Low Stock
            </span>
          ) : (
            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
              In Stock
            </span>
          )}
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex flex-col">
            {product.basePrice && product.basePrice !== product.price ? (
              <>
                <span className="text-sm text-gray-500 line-through">
                  ${product.basePrice.toFixed(2)}
                </span>
                <span className="text-xl font-bold text-blue-600">
                  ${product.price.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-blue-600">
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isAdding || (product.stock ?? 0) === 0}
            className={`px-4 py-2 rounded text-white font-semibold transition ${
              (product.stock ?? 0) === 0
                ? "bg-gray-400 cursor-not-allowed"
                : isAdding
                ? "bg-green-600 cursor-default"
                : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
            }`}
          >
            {(product.stock ?? 0) === 0
              ? "Out of Stock"
              : isAdding
              ? "Adding..."
              : "Add to Cart"}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>
    </div>
  );
}
