"use client";

import React from "react";
import DefaultDiscountPanel from "@/components/DefaultDiscountPanel";
import CategoryDiscountPanel from "@/components/CategoryDiscountPanel";
import ProductPricingList from "@/components/ProductPricingList";

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

interface CategoryDiscount {
  id: string;
  category: string;
  discountPercent: number;
}

interface Props {
  selectedDist?: { defaultDiscountPercent?: number | null };
  selectedDistributor: string;
  defaultDiscount: string;
  setDefaultDiscount: (v: string) => void;
  isSavingDiscount: boolean;
  handleSaveDefaultDiscount: () => Promise<void>;
  categoryDiscounts: CategoryDiscount[];
  categories: string[];
  newCategory: string;
  setNewCategory: (s: string) => void;
  newCategoryDiscount: string;
  setNewCategoryDiscount: (s: string) => void;
  isSavingCategory: boolean;
  handleSaveCategoryDiscount: () => Promise<void>;
  handleDeleteCategoryDiscount: (category: string) => Promise<void>;
  products: Product[];
  distributorPricing: PricingRule[];
  onReloadProducts?: () => Promise<void>;
  onReloadPricing?: () => Promise<void>;
}

export default function PricingPanel({
  selectedDist,
  selectedDistributor,
  defaultDiscount,
  setDefaultDiscount,
  isSavingDiscount,
  handleSaveDefaultDiscount,
  categoryDiscounts,
  categories,
  newCategory,
  setNewCategory,
  newCategoryDiscount,
  setNewCategoryDiscount,
  isSavingCategory,
  handleSaveCategoryDiscount,
  handleDeleteCategoryDiscount,
  products,
  distributorPricing,
  onReloadProducts,
  onReloadPricing
}: Props) {
  const [showPricingJson, setShowPricingJson] = React.useState(false);
  return (
    <div className="bg-white rounded-lg shadow">
      <DefaultDiscountPanel
        selectedDist={selectedDist}
        defaultDiscount={defaultDiscount}
        setDefaultDiscount={setDefaultDiscount}
        isSavingDiscount={isSavingDiscount}
        handleSaveDefaultDiscount={handleSaveDefaultDiscount}
      />

      <CategoryDiscountPanel
        categoryDiscounts={categoryDiscounts}
        categories={categories}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        newCategoryDiscount={newCategoryDiscount}
        setNewCategoryDiscount={setNewCategoryDiscount}
        isSavingCategory={isSavingCategory}
        handleSaveCategoryDiscount={handleSaveCategoryDiscount}
        handleDeleteCategoryDiscount={handleDeleteCategoryDiscount}
      />

      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Product Pricing</h3>
          <p className="text-sm text-gray-600">
            Set custom prices or tiered pricing for specific products.{" "}
            <span className="font-medium text-blue-600">
              Overrides Category Discounts and Default Discount.
            </span>
          </p>
          <div className="mt-2 text-sm text-gray-500 flex items-center gap-3">
            <span>
              Pricing rules: <strong>{distributorPricing.length}</strong>
            </span>
            {onReloadPricing && (
              <button
                onClick={onReloadPricing}
                className="text-sm text-blue-600 hover:underline"
              >
                Reload pricing
              </button>
            )}
            {distributorPricing.length === 0 && (
              <span className="text-xs text-gray-400">
                No custom prices set for this distributor.
              </span>
            )}
            <button
              onClick={() => setShowPricingJson(s => !s)}
              className="text-sm text-gray-600 hover:underline"
            >
              {showPricingJson ? "Hide JSON" : "Show pricing JSON"}
            </button>
          </div>
          {showPricingJson && (
            <pre className="mt-3 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">
              {JSON.stringify(distributorPricing, null, 2)}
            </pre>
          )}
        </div>

        {products.length === 0 ? (
          <PricingEmpty onReload={onReloadProducts} />
        ) : (
          <ProductPricingList
            products={products}
            distributorPricing={distributorPricing}
            selectedDistributor={selectedDistributor}
          />
        )}
      </div>
    </div>
  );
}

function PricingEmpty({ onReload }: { onReload?: () => Promise<void> }) {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    if (!onReload) {
      window.location.reload();
      return;
    }
    try {
      setLoading(true);
      await onReload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center py-8 text-gray-500">
      No products available
      <div className="mt-3">
        <button
          onClick={handleClick}
          disabled={loading}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Reloading..." : "Reload products"}
        </button>
      </div>
    </div>
  );
}
