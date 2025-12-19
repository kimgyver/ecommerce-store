"use client";

import { getProductById, getProductsByCategory } from "@/lib/products-server";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart-context";
import { notFound, useParams } from "next/navigation";
import type { Product } from "@/lib/products";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const productData = await getProductById(id);
        if (!productData) {
          notFound();
        }
        setProduct(productData);

        // Load related products
        if (productData.category) {
          const related = await getProductsByCategory(productData.category);
          setRelatedProducts(related.filter(p => p.id !== id).slice(0, 3));
        }
      } catch (error) {
        console.error("Failed to load product:", error);
        notFound();
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-8">Loading...</div>;
  }

  if (!product) {
    notFound();
  }

  const handleAddToCart = async () => {
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
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Product details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Image */}
        <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>

        {/* Product info */}
        <div>
          <p className="text-gray-500 text-sm">{product.category}</p>
          <h1 className="text-4xl font-bold mt-2">{product.name}</h1>
          <p className="text-gray-600 mt-4">{product.description}</p>

          <div className="mt-8 border-t border-b py-8">
            <p className="text-gray-600">Price</p>
            <p className="text-4xl font-bold text-blue-600 mt-2">
              ${product.price.toLocaleString("en-US")}
            </p>
          </div>

          {/* Quantity selector */}
          <div className="mt-8 flex items-center gap-4">
            <label className="text-gray-700 font-semibold">Quantity:</label>
            <div className="flex items-center border border-gray-300 rounded">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-2 hover:bg-gray-100"
              >
                −
              </button>
              <span className="px-4 py-2">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-2 hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            disabled={isAdded}
            className={`w-full mt-8 py-3 rounded-lg text-white font-bold text-lg transition ${
              isAdded
                ? "bg-green-600 cursor-default"
                : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
            }`}
          >
            {isAdded ? "✓ Added to cart!" : "🛒 Add to Cart"}
          </button>
        </div>
      </div>

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
                <div className="relative w-full h-48 bg-gray-100">
                  <Image
                    src={relatedProduct.image}
                    alt={relatedProduct.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{relatedProduct.name}</h3>
                  <p className="text-blue-600 font-bold mt-2">
                    ${relatedProduct.price.toLocaleString("en-US")}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
