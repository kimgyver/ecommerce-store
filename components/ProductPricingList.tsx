"use client";

import React from "react";
import ProductPricingItem from "@/components/ProductPricingItem";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
}

interface DiscountTier {
  minQty: number;
  maxQty: number | null;
  price: number;
}

interface PricingRule {
  id: string;
  customPrice: number;
  discountTiers: DiscountTier[] | null;
  product: Product;
}

interface Props {
  products: Product[];
  distributorPricing: PricingRule[];
  selectedDistributor: string;
}

export default function ProductPricingList({
  products,
  distributorPricing,
  selectedDistributor
}: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No products available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {products.map(product => {
        const pricing = distributorPricing.find(p => {
          // handle shapes where pricing may include product object or productId
          const pid =
            (p as any).product?.id ??
            (p as any).productId ??
            (p as any).product?.id;
          return pid === product.id;
        });
        return (
          <ProductPricingItem
            key={product.id}
            product={product}
            pricing={pricing}
            selectedDistributor={selectedDistributor}
          />
        );
      })}
    </div>
  );
}
