"use client";

import { useState, useEffect } from "react";
import { Toast } from "@/components/toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DiscountTier {
  minQty: number;
  maxQty: number | null;
  price: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  category: string;
}

interface Distributor {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
}

interface PricingData {
  exists: boolean;
  pricing?: {
    customPrice: number;
    discountTiers: DiscountTier[] | null;
    product: Product;
    distributor: Distributor;
  };
  product?: Product;
  distributor?: Distributor;
}

export default function EditB2BPricingPage({
  params
}: {
  params: Promise<{ distributorId: string; productId: string }>;
}) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{
    distributorId: string;
    productId: string;
  } | null>(null);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [discountTiers, setDiscountTiers] = useState<DiscountTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error" | "info";
  } | null>(null);

  useEffect(() => {
    params.then(p => setResolvedParams(p));
  }, [params]);

  useEffect(() => {
    if (resolvedParams) {
      loadPricing();
    }
  }, [resolvedParams]);

  const loadPricing = async () => {
    if (!resolvedParams) return;

    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/admin/b2b-pricing/${resolvedParams.distributorId}/${resolvedParams.productId}`
      );

      if (response.ok) {
        const data: PricingData = await response.json();
        setPricingData(data);

        if (data.exists && data.pricing) {
          setCustomPrice(data.pricing.customPrice);
          setDiscountTiers(
            (data.pricing.discountTiers as DiscountTier[]) || []
          );
        } else if (data.product) {
          // Initialize with base price
          setCustomPrice(data.product.price);
          setDiscountTiers([]);
        }
      }
    } catch (error) {
      console.error("Failed to load pricing:", error);
      setToast({ message: "Failed to load pricing data", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resolvedParams) return;

    try {
      setIsSaving(true);

      const response = await fetch(
        `/api/admin/b2b-pricing/${resolvedParams.distributorId}/${resolvedParams.productId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customPrice,
            discountTiers: discountTiers.length > 0 ? discountTiers : null
          })
        }
      );

      if (response.ok) {
        setToast({ message: "Pricing updated successfully!", type: "success" });
        router.push(
          `/admin/b2b-management?distributor=${resolvedParams.distributorId}&tab=pricing`
        );
      } else {
        const error = await response.json();
        setToast({
          message: `Failed to update: ${error.error}`,
          type: "error"
        });
      }
    } catch (error) {
      console.error("Save error:", error);
      setToast({ message: "Failed to save pricing", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!resolvedParams) return;
    if (!confirm("Are you sure you want to delete this custom pricing?"))
      return;

    try {
      const response = await fetch(
        `/api/admin/b2b-pricing/${resolvedParams.distributorId}/${resolvedParams.productId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setToast({ message: "Pricing deleted successfully!", type: "success" });
        router.push(
          `/admin/b2b-management?distributor=${resolvedParams.distributorId}&tab=pricing`
        );
      } else {
        setToast({ message: "Failed to delete pricing", type: "error" });
      }
    } catch (error) {
      console.error("Delete error:", error);
      setToast({ message: "Failed to delete pricing", type: "error" });
    }
  };

  const addTier = () => {
    const lastTier = discountTiers[discountTiers.length - 1];
    const newMinQty = lastTier ? (lastTier.maxQty || 0) + 1 : 1;

    setDiscountTiers([
      ...discountTiers,
      {
        minQty: newMinQty,
        maxQty: newMinQty + 9,
        price: customPrice
      }
    ]);
  };

  const removeTier = (index: number) => {
    setDiscountTiers(discountTiers.filter((_, i) => i !== index));
  };

  const updateTier = (
    index: number,
    field: keyof DiscountTier,
    value: number | null
  ) => {
    const updated = [...discountTiers];
    updated[index] = { ...updated[index], [field]: value };
    setDiscountTiers(updated);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Loading...</p>
      </div>
    );
  }

  const product = pricingData?.pricing?.product || pricingData?.product;
  const distributor =
    pricingData?.pricing?.distributor || pricingData?.distributor;

  if (!product || !distributor) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-semibold mb-4">
          Product or distributor not found
        </p>
        <Link
          href={`/admin/b2b-management?distributor=${resolvedParams?.distributorId}&tab=pricing`}
          className="text-blue-600 hover:underline"
        >
          ← Back to B2B Management
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type as "success" | "error" | "info"}
          onClose={() => setToast(null)}
        />
      )}
      <div className="mb-6">
        <Link
          href={`/admin/b2b-management?distributor=${resolvedParams?.distributorId}&tab=pricing`}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ← Back to B2B Management
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">Edit B2B Pricing</h1>

        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm text-gray-600 font-medium">Distributor</div>
            <div className="font-semibold text-lg">
              {distributor.companyName || distributor.name}
            </div>
            <div className="text-sm text-gray-600">{distributor.email}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 font-medium">Product</div>
            <div className="font-semibold text-lg">{product.name}</div>
            <div className="text-sm text-gray-600">
              SKU: {product.sku} | Base Price: $
              {product.price.toLocaleString("en-US")}
            </div>
          </div>
        </div>

        {/* Custom Base Price */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Custom Base Price
          </label>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                $
              </span>
              <input
                type="number"
                value={customPrice}
                onChange={e => setCustomPrice(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="text-sm text-gray-600">
              {product.price > 0 && customPrice !== product.price && (
                <span className="font-medium">
                  {((1 - customPrice / product.price) * 100).toFixed(1)}%
                  discount
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This is the base price for this distributor (without quantity tiers)
          </p>
        </div>

        {/* Quantity Discount Tiers */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Quantity Discount Tiers (Optional)
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Set different prices based on order quantity
              </p>
            </div>
            <button
              onClick={addTier}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              + Add Tier
            </button>
          </div>

          {discountTiers.length === 0 ? (
            <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-500 text-sm border border-dashed border-gray-300">
              No quantity tiers. Click "Add Tier" to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {discountTiers.map((tier, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Min Qty
                      </label>
                      <input
                        type="number"
                        value={tier.minQty}
                        onChange={e =>
                          updateTier(
                            index,
                            "minQty",
                            parseInt(e.target.value) || 0
                          )
                        }
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Max Qty (blank = ∞)
                      </label>
                      <input
                        type="number"
                        value={tier.maxQty || ""}
                        onChange={e =>
                          updateTier(
                            index,
                            "maxQty",
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        min="1"
                        placeholder="unlimited"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <input
                          type="number"
                          value={tier.price}
                          onChange={e =>
                            updateTier(
                              index,
                              "price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          step="0.01"
                          min="0"
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeTier(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div>
            {pricingData?.exists && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
              >
                Delete Custom Pricing
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              href={`/admin/b2b-management?distributor=${resolvedParams?.distributorId}&tab=pricing`}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
            >
              {isSaving ? "Saving..." : "Save Pricing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
