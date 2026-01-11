"use client";

import React from "react";
import Link from "next/link";

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
  product: Product;
  pricing?: PricingRule | undefined;
  selectedDistributor: string;
}

export default function ProductPricingItem({
  product,
  pricing,
  selectedDistributor
}: Props) {
  const hasTiers = pricing?.discountTiers && pricing.discountTiers.length > 0;

  return (
    <Link
      key={product.id}
      href={`/admin/b2b-management/${selectedDistributor}/${product.id}`}
      className="block p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{product.name}</div>
          <div className="text-sm text-gray-600 mt-1">
            SKU: {product.sku} | Base Price: $
            {product.price.toLocaleString("en-US")}
          </div>
          {pricing && (
            <div className="mt-2 space-y-1">
              <div className="text-sm font-medium text-blue-600">
                Custom Price: ${pricing.customPrice.toFixed(2)}
              </div>
              {hasTiers && (
                <div className="text-xs text-gray-600">
                  🎯 {pricing.discountTiers!.length} tier
                  {pricing.discountTiers!.length !== 1 ? "s" : ""}:
                  {pricing.discountTiers!.map((tier, idx) => (
                    <span key={idx} className="ml-2 inline-block">
                      {tier.minQty}
                      {tier.maxQty ? `-${tier.maxQty}` : "+"} qty → $
                      {tier.price.toFixed(2)}
                      {idx < pricing.discountTiers!.length - 1 ? "," : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="text-blue-600 font-semibold ml-4">
          {pricing ? "Edit" : "Set Price"} →
        </div>
      </div>
    </Link>
  );
}
