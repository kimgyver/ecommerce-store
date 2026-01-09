"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart-context";
import type { Product as BaseProduct } from "@/lib/products";
import QuoteRequestForm from "@/components/QuoteRequestForm";
import { useSession } from "next-auth/react";
import ReviewForm from "@/components/ReviewForm";
import ReviewsList from "@/components/ReviewsList";
import { StarRating } from "@/components/star-rating";
import { useParams } from "next/navigation";
import Link from "next/link";

interface DiscountTier {
  minQty: number;
  maxQty: number | null;
  price: number;
}

interface Product extends BaseProduct {
  sku?: string;
}

interface ProductWithTiers extends Product {
  discountTiers?: {
    customPrice: number;
    tiers: DiscountTier[];
  } | null;
}

export default function ProductDetailPage() {
  const { data: session } = useSession();
  console.log("[ProductDetailPage] session:", session);
  const params = useParams();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";
  const [product, setProduct] = useState<ProductWithTiers | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshReviews, setRefreshReviews] = useState(0);
  const { addToCart, items: cartItems } = useCart();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        // Use API endpoint to get role-based pricing
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) {
          setProduct(null);
          return;
        }
        const productData = await response.json();
        setProduct(productData);

        // Load related products from same category
        if (productData.category) {
          const allProductsResponse = await fetch("/api/products");
          if (allProductsResponse.ok) {
            const allProducts = await allProductsResponse.json();
            const related = allProducts
              .filter(
                (p: Product) =>
                  p.category === productData.category && p.id !== id
              )
              .slice(0, 3);
            setRelatedProducts(related);
          }
        }
      } catch (error) {
        console.error("Failed to load product:", error);
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Image Skeleton */}
          <div className="animate-pulse">
            <div className="bg-gray-200 w-full aspect-square rounded-lg"></div>
          </div>

          {/* Product Info Skeleton */}
          <div className="animate-pulse">
            {/* Category */}
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>

            {/* Title */}
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>

            {/* Rating */}
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-6"></div>

            {/* Price */}
            <div className="h-10 bg-gray-200 rounded w-1/2 mb-6"></div>

            {/* Stock status */}
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>

            {/* Description */}
            <div className="space-y-2 mb-6">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>

            {/* Quantity selector */}
            <div className="h-12 bg-gray-200 rounded w-1/2 mb-4"></div>

            {/* Add to cart button */}
            <div className="h-12 bg-gray-200 rounded w-full"></div>
          </div>
        </div>

        {/* Related Products Skeleton */}
        <div className="mt-16">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="animate-pulse">
                <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    // Not found fallback for client component
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
        <p className="text-gray-600 mb-8">
          The product you are looking for does not exist or could not be loaded.
        </p>
        <Link href="/products" className="text-blue-600 hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }

  // Calculate available stock considering cart items
  const cartItemQuantity =
    cartItems.find(item => item.id === id)?.quantity ?? 0;
  const availableStock = (product.stock ?? 0) - cartItemQuantity;

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image
      });
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Product details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Image */}
        <div
          className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center p-4"
          style={{ aspectRatio: "1 / 1" }}
        >
          {product && (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain"
            />
          )}
        </div>

        {/* Product info */}
        <div>
          <p className="text-gray-500 text-sm">{product?.category}</p>
          <h1 className="text-4xl font-bold mt-2">{product?.name}</h1>

          {/* Rating */}
          {product?.rating && (
            <div className="mt-3">
              <StarRating
                rating={product.rating}
                reviewCount={product.reviewCount}
                size="lg"
              />
            </div>
          )}

          <p className="text-gray-600 mt-4">{product?.description}</p>

          <div className="mt-8 border-t border-b py-8">
            <p className="text-gray-600">Price</p>
            {product?.basePrice && product?.basePrice !== product?.price ? (
              <div className="mt-2">
                <p className="text-2xl text-gray-500 line-through">
                  ${product?.basePrice?.toFixed(2)}
                </p>
                <p className="text-4xl font-bold text-blue-600 mt-1">
                  ${product?.price?.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="text-4xl font-bold text-blue-600 mt-2">
                ${product?.price?.toFixed(2)}
              </p>
            )}
          </div>

          {/* Tiered Pricing Table */}
          {product?.discountTiers &&
            product?.discountTiers.tiers &&
            product?.discountTiers.tiers.length > 0 && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  <p className="text-sm font-bold text-blue-900">
                    Volume Discount Pricing
                  </p>
                </div>
                <div className="space-y-2">
                  {product.discountTiers.tiers.map((tier, index) => {
                    const totalQuantity = cartItemQuantity + quantity;
                    const isCurrentTier =
                      totalQuantity >= tier.minQty &&
                      (tier.maxQty === null || totalQuantity <= tier.maxQty);
                    return (
                      <div
                        key={index}
                        className={`flex justify-between items-center px-3 py-2 rounded ${
                          isCurrentTier
                            ? "bg-blue-600 text-white font-semibold"
                            : "bg-white text-gray-700"
                        }`}
                      >
                        <span className="text-sm">
                          {tier.minQty}-{tier.maxQty || "∞"} units
                        </span>
                        <span className="font-semibold">
                          ${tier.price.toFixed(2)} each
                        </span>
                      </div>
                    );
                  })}
                </div>
                {cartItemQuantity > 0 ? (
                  <p className="text-xs text-blue-800 mt-3">
                    💡 Total: {cartItemQuantity} in cart + {quantity} selected ={" "}
                    <strong>{cartItemQuantity + quantity} units</strong>
                  </p>
                ) : (
                  <p className="text-xs text-blue-800 mt-3">
                    💡 Adjust quantity to see pricing changes
                  </p>
                )}
              </div>
            )}

          {/* Stock status */}
          <div className="mt-6">
            {availableStock <= 0 ? (
              <div className="inline-block px-4 py-2 bg-red-100 text-red-800 rounded-lg font-semibold">
                Out of Stock
              </div>
            ) : availableStock <= 5 ? (
              <div className="inline-block px-4 py-2 bg-orange-100 text-orange-800 rounded-lg font-semibold">
                Low Stock ({availableStock} left)
              </div>
            ) : (
              <div className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
                In Stock
              </div>
            )}
            {cartItemQuantity > 0 && (
              <p className="text-gray-600 text-sm mt-2">
                You have {cartItemQuantity} in your cart
              </p>
            )}
          </div>

          {/* Quantity selector */}
          <div className="mt-8 flex items-center gap-4">
            <label className="text-gray-700 font-semibold">Quantity:</label>
            <div className="flex items-center border border-gray-300 rounded">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={availableStock === 0}
                className={`px-3 py-2 ${
                  availableStock === 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "hover:bg-gray-100"
                }`}
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={e => {
                  const value = parseInt(e.target.value) || 1;
                  setQuantity(Math.max(1, Math.min(value, availableStock)));
                }}
                disabled={availableStock === 0}
                className="w-20 px-2 py-2 text-center border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max={availableStock}
              />
              <button
                onClick={() =>
                  setQuantity(Math.min(quantity + 1, availableStock))
                }
                disabled={availableStock === 0 || quantity >= availableStock}
                className={`px-3 py-2 ${
                  availableStock === 0 || quantity >= availableStock
                    ? "text-gray-400 cursor-not-allowed"
                    : "hover:bg-gray-100"
                }`}
              >
                +
              </button>
            </div>
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            disabled={isAdded || isAdding || availableStock <= 0}
            className={`w-full mt-8 py-3 rounded-lg text-white font-bold text-lg transition ${
              availableStock <= 0
                ? "bg-gray-400 cursor-not-allowed"
                : isAdded
                ? "bg-green-600 cursor-default"
                : isAdding
                ? "bg-blue-400 cursor-wait"
                : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
            }`}
          >
            {availableStock <= 0
              ? "Out of Stock"
              : isAdded
              ? "✓ Added to cart!"
              : isAdding
              ? "Adding..."
              : "🛒 Add to Cart"}
          </button>
        </div>
      </div>

      {/* Quote Request Form (Business Quote Request, visible to all) */}
      {product && (
        <div className="mt-12 border-t pt-8">
          <details className="max-w-lg mx-auto">
            <summary className="cursor-pointer text-blue-700 font-semibold text-base mb-2">
              Business Quote Request
            </summary>
            <div className="mt-4">
              <QuoteRequestForm
                productId={product.id}
                productSku={product.sku}
                productName={product.name}
                defaultQuantity={quantity}
                small
              />
            </div>
          </details>
        </div>
      )}

      {/* Related products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedProducts.map(relatedProduct => (
              <a
                key={relatedProduct.id}
                href={`/products/${relatedProduct.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition"
              >
                <div
                  className="relative w-full bg-gray-100 flex items-center justify-center p-2"
                  style={{ aspectRatio: "1 / 1" }}
                >
                  <Image
                    src={relatedProduct.image}
                    alt={relatedProduct.name}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{relatedProduct.name}</h3>
                  {relatedProduct.basePrice &&
                  relatedProduct.basePrice !== relatedProduct.price ? (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 line-through">
                        ${relatedProduct.basePrice.toFixed(2)}
                      </p>
                      <p className="text-blue-600 font-bold">
                        ${relatedProduct.price.toFixed(2)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-blue-600 font-bold mt-2">
                      ${relatedProduct.price.toFixed(2)}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Reviews section */}
      {product && (
        <div className="mt-12 border-t pt-8">
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          <ReviewForm
            productId={product.id}
            onReviewCreated={() => setRefreshReviews(refreshReviews + 1)}
          />
          <ReviewsList key={refreshReviews} productId={product.id} />
        </div>
      )}
    </div>
  );
}
