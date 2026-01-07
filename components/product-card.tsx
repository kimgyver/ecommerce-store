"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/products";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useSession } from "next-auth/react";
import { StarRating } from "@/components/star-rating";

interface ProductCardProps {
  product: Product;
  viewMode?: "grid" | "list";
  onQuickView?: (productId: string) => void;
}

export function ProductCard({
  product,
  viewMode = "grid",
  onQuickView
}: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { data: session } = useSession();
  const inWishlist = isInWishlist(product.id);

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

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      alert("Please sign in to use wishlist");
      return;
    }

    try {
      if (inWishlist) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist(product.id);
      }
    } catch (err) {
      console.error("Wishlist error:", err);
    }
  };

  // List view layout
  if (viewMode === "list") {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition flex relative group">
        {/* Wishlist button - top right */}
        <button
          onClick={handleWishlistToggle}
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition"
          title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <svg
            className={`w-6 h-6 ${
              inWishlist ? "fill-red-500" : "fill-none"
            } stroke-current ${inWishlist ? "text-red-500" : "text-gray-600"}`}
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>

        {/* Quick View button - appears on hover */}
        {onQuickView && (
          <button
            onClick={() => onQuickView(product.id)}
            className="absolute top-2 right-14 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition opacity-0 group-hover:opacity-100"
            title="Quick View"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
        )}

        <Link href={`/products/${product.id}`} className="flex-shrink-0">
          <div className="relative w-48 h-48 bg-gray-200 flex items-center justify-center p-2">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain hover:scale-105 transition"
            />
          </div>
        </Link>
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <p className="text-sm text-gray-500">{product.category}</p>
            <Link href={`/products/${product.id}`}>
              <h3 className="text-xl font-semibold mt-1 hover:text-blue-600 transition">
                {product.name}
              </h3>
            </Link>
            <div className="mt-2">
              <StarRating
                rating={product.rating || 0}
                reviewCount={product.reviewCount}
                size="sm"
              />
            </div>
            <p className="text-gray-600 text-sm mt-2 line-clamp-2">
              {product.description}
            </p>
          </div>

          <div className="flex justify-between items-end mt-4">
            <div className="flex flex-col gap-2">
              {/* Stock status */}
              <div>
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

              {/* Price */}
              <div>
                {product.basePrice && product.basePrice !== product.price ? (
                  <>
                    <span className="text-sm text-gray-500 line-through">
                      ${product.basePrice.toFixed(2)}
                    </span>
                    <span className="text-2xl font-bold text-blue-600 ml-2">
                      ${product.price.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-blue-600">
                    ${product.price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isAdding || (product.stock ?? 0) === 0}
              className={`px-6 py-3 rounded text-white font-semibold transition ${
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

  // Grid view layout (default)
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition relative group">
      {/* Wishlist button - top right */}
      <button
        onClick={handleWishlistToggle}
        className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition"
        title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      >
        <svg
          className={`w-5 h-5 ${
            inWishlist ? "fill-red-500" : "fill-none"
          } stroke-current ${inWishlist ? "text-red-500" : "text-gray-600"}`}
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      </button>

      {/* Quick View button - appears on hover */}
      {onQuickView && (
        <button
          onClick={() => onQuickView(product.id)}
          className="absolute top-2 right-12 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition opacity-0 group-hover:opacity-100"
          title="Quick View"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </button>
      )}

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
        <div className="mt-2">
          <StarRating
            rating={product.rating || 0}
            reviewCount={product.reviewCount}
            size="sm"
          />
        </div>
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
