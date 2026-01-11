"use client";

import React from "react";

interface Props {
  selectedDist?: { defaultDiscountPercent?: number | null };
  defaultDiscount: string;
  setDefaultDiscount: (v: string) => void;
  isSavingDiscount: boolean;
  handleSaveDefaultDiscount: () => Promise<void>;
}

export default function DefaultDiscountPanel({
  selectedDist,
  defaultDiscount,
  setDefaultDiscount,
  isSavingDiscount,
  handleSaveDefaultDiscount
}: Props) {
  return (
    <div className="p-6 border-b bg-green-50">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Default Discount</h3>
        <p className="text-sm text-gray-600">
          Fallback discount for all products without specific pricing.{" "}
          <span className="font-medium text-green-600">
            Applies company-wide unless overridden.
          </span>
        </p>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Discount Percentage
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={defaultDiscount}
              onChange={e => setDefaultDiscount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 border rounded-lg pr-8 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <span className="absolute right-3 top-2.5 text-gray-500">%</span>
          </div>
        </div>
        <button
          onClick={handleSaveDefaultDiscount}
          disabled={isSavingDiscount}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {isSavingDiscount ? "Saving..." : "Save"}
        </button>
      </div>

      {selectedDist?.defaultDiscountPercent !== null &&
        selectedDist?.defaultDiscountPercent !== undefined &&
        selectedDist?.defaultDiscountPercent > 0 && (
          <div className="mt-3 p-3 bg-white rounded border border-green-200">
            <p className="text-sm text-green-700">
              ✓ Current: <strong>{selectedDist.defaultDiscountPercent}%</strong>{" "}
              discount on all products (unless overridden by product/category
              pricing)
            </p>
          </div>
        )}
    </div>
  );
}
