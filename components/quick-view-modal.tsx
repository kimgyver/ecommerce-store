"use client";

import { Product } from "@/lib/products";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart-context";

interface QuickViewModalProps {
  productId: string | null;
  onClose: () => void;
}

export function QuickViewModal({ productId, onClose }: QuickViewModalProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }

    const loadProduct = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/products/${productId}`);
        if (response.ok) {
          const data = await response.json();
          setProduct(data);
        }
      } catch (error) {
        console.error("Failed to load product:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      setIsAdding(true);
      await addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        image: product.image
      });
      setTimeout(() => {
        setIsAdding(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Error adding to cart:", err);
      setIsAdding(false);
    }
  };

  if (!productId) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Quick View</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : product ? (
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Product Image */}
              <div className="relative aspect-square bg-gray-100 rounded-lg">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                />
              </div>

              {/* Product Details */}
              <div className="flex flex-col">
                <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                <h3 className="text-2xl font-bold mb-4">{product.name}</h3>

                {/* Price */}
                <div className="mb-4">
                  {product.basePrice && product.basePrice !== product.price ? (
                    <>
                      <span className="text-lg text-gray-500 line-through mr-2">
                        ${product.basePrice.toFixed(2)}
                      </span>
                      <span className="text-3xl font-bold text-blue-600">
                        ${product.price.toFixed(2)}
                      </span>
                      <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-sm rounded font-semibold">
                        {(
                          ((product.basePrice - product.price) /
                            product.basePrice) *
                          100
                        ).toFixed(0)}
                        % OFF
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-blue-600">
                      ${product.price.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Stock Status */}
                <div className="mb-4">
                  {(product.stock ?? 0) === 0 ? (
                    <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded font-semibold">
                      Out of Stock
                    </span>
                  ) : (product.stock ?? 0) <= 5 ? (
                    <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded font-semibold">
                      Only {product.stock} left!
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded font-semibold">
                      In Stock ({product.stock} available)
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-6">{product.description}</p>

                {/* Quantity Selector */}
                {(product.stock ?? 0) > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                      Quantity:
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={product.stock}
                        value={quantity}
                        onChange={e =>
                          setQuantity(
                            Math.max(
                              1,
                              Math.min(
                                product.stock ?? 1,
                                parseInt(e.target.value) || 1
                              )
                            )
                          )
                        }
                        className="w-20 px-3 py-2 border border-gray-300 rounded text-center"
                      />
                      <button
                        onClick={() =>
                          setQuantity(
                            Math.min(product.stock ?? 1, quantity + 1)
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-auto">
                  <button
                    onClick={handleAddToCart}
                    disabled={isAdding || (product.stock ?? 0) === 0}
                    className={`flex-1 px-6 py-3 rounded font-semibold transition ${
                      (product.stock ?? 0) === 0
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : isAdding
                        ? "bg-green-600 text-white"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {(product.stock ?? 0) === 0
                      ? "Out of Stock"
                      : isAdding
                      ? "Added!"
                      : "Add to Cart"}
                  </button>
                  <Link
                    href={`/products/${product.id}`}
                    className="px-6 py-3 border border-gray-300 rounded font-semibold hover:bg-gray-100 transition"
                    onClick={onClose}
                  >
                    Full Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">Product not found</div>
        )}
      </div>
    </div>
  );
}
