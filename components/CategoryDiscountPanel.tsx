"use client";

import React from "react";

interface CategoryDiscount {
  id: string;
  category: string;
  discountPercent: number;
}

interface Props {
  categoryDiscounts: CategoryDiscount[];
  categories: string[];
  newCategory: string;
  setNewCategory: (s: string) => void;
  newCategoryDiscount: string;
  setNewCategoryDiscount: (s: string) => void;
  isSavingCategory: boolean;
  handleSaveCategoryDiscount: () => Promise<void>;
  handleDeleteCategoryDiscount: (category: string) => Promise<void>;
}

export default function CategoryDiscountPanel({
  categoryDiscounts,
  categories,
  newCategory,
  setNewCategory,
  newCategoryDiscount,
  setNewCategoryDiscount,
  isSavingCategory,
  handleSaveCategoryDiscount,
  handleDeleteCategoryDiscount
}: Props) {
  return (
    <div className="p-6 border-b bg-purple-50">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Category Discounts</h3>
        <p className="text-sm text-gray-600">
          Set different discounts for specific product categories.{" "}
          <span className="font-medium text-purple-600">
            Overrides Default Discount.
          </span>
        </p>
      </div>

      {categoryDiscounts.length > 0 && (
        <div className="mb-4 space-y-2">
          {categoryDiscounts.map(cd => (
            <div
              key={cd.id}
              className="flex items-center justify-between p-3 bg-white rounded border"
            >
              <div>
                <span className="font-semibold">{cd.category}</span>
                <span className="text-purple-600 ml-3">
                  {cd.discountPercent}% off
                </span>
              </div>
              <button
                onClick={() => handleDeleteCategoryDiscount(cd.category)}
                className="text-red-600 hover:text-red-800 text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex gap-3">
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Select category...</option>
            {categories
              .filter(cat => !categoryDiscounts.find(cd => cd.category === cat))
              .map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
          </select>

          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={newCategoryDiscount}
              onChange={e => setNewCategoryDiscount(e.target.value)}
              placeholder="0"
              className="w-32 px-4 py-2 pr-8 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              %
            </span>
          </div>

          <button
            onClick={handleSaveCategoryDiscount}
            disabled={isSavingCategory}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {isSavingCategory ? "Saving..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
