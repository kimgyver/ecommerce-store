"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Toast } from "@/components/toast";

interface Distributor {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  phone: string | null;
  createdAt: string;
  defaultDiscountPercent: number | null;
  _count: {
    distributorPrices: number;
    categoryDiscounts: number;
  };
}

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  category: string;
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
  product: {
    id: string;
    sku: string;
    name: string;
    price: number;
  };
}

interface CategoryDiscount {
  id: string;
  category: string;
  discountPercent: number;
}

export default function B2BPricingPage() {
  const searchParams = useSearchParams();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState<string>("");
  const [distributorPricing, setDistributorPricing] = useState<PricingRule[]>(
    []
  );
  const [categoryDiscounts, setCategoryDiscounts] = useState<
    CategoryDiscount[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultDiscount, setDefaultDiscount] = useState<string>("");
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<string>("");
  const [newCategoryDiscount, setNewCategoryDiscount] = useState<string>("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ message, type });
  };

  useEffect(() => {
    // Set page title
    loadData();
  }, []);

  useEffect(() => {
    // Restore selected distributor from URL
    const distributorId = searchParams.get("distributor");
    if (distributorId) {
      setSelectedDistributor(distributorId);
    }
  }, [searchParams]);

  useEffect(() => {
    // Load pricing info when distributor is selected
    if (selectedDistributor) {
      loadDistributorPricing();
      loadCategoryDiscounts();
      // Set default discount from selected distributor
      const dist = distributors.find(d => d.id === selectedDistributor);
      setDefaultDiscount(dist?.defaultDiscountPercent?.toString() || "");
    } else {
      setDistributorPricing([]);
      setCategoryDiscounts([]);
      setDefaultDiscount("");
    }
  }, [selectedDistributor, distributors]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [distResponse, prodResponse] = await Promise.all([
        fetch("/api/admin/distributors"),
        fetch("/api/products")
      ]);

      if (distResponse.ok) {
        const data = await distResponse.json();
        setDistributors(data.distributors || []);
      }

      if (prodResponse.ok) {
        const data = await prodResponse.json();
        // /api/products returns array directly, not wrapped in {products: [...]}
        const allProducts = Array.isArray(data) ? data : [];
        setProducts(allProducts);

        // Extract unique categories
        const uniqueCategories = [
          ...new Set(allProducts.map(p => p.category))
        ].sort();
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDistributorPricing = async () => {
    try {
      const response = await fetch(
        `/api/admin/b2b-pricing/${selectedDistributor}`,
        {
          credentials: "include"
        }
      );
      if (response.ok) {
        const data = await response.json();
        setDistributorPricing(data.pricingRules || []);
      }
    } catch (error) {
      console.error("Failed to load distributor pricing:", error);
    }
  };

  const loadCategoryDiscounts = async () => {
    if (!selectedDistributor) return;

    try {
      const response = await fetch(
        `/api/admin/distributors/${selectedDistributor}/category-discounts`,
        { credentials: "include" }
      );
      if (response.ok) {
        const data = await response.json();
        setCategoryDiscounts(data.categoryDiscounts || []);
      }
    } catch (error) {
      console.error("Failed to load category discounts:", error);
    }
  };

  const handleSaveCategoryDiscount = async () => {
    if (!selectedDistributor || !newCategory || !newCategoryDiscount) {
      showToast(
        "Please select a category and enter a discount percentage",
        "error"
      );
      return;
    }

    const discountValue = parseFloat(newCategoryDiscount);
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      showToast("Please enter a valid discount percentage (0-100)", "error");
      return;
    }

    setIsSavingCategory(true);
    try {
      const response = await fetch(
        `/api/admin/distributors/${selectedDistributor}/category-discounts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: newCategory,
            discountPercent: discountValue
          }),
          credentials: "include"
        }
      );

      if (response.ok) {
        showToast("Category discount saved!");
        setNewCategory("");
        setNewCategoryDiscount("");
        await loadCategoryDiscounts();
      } else {
        const error = await response.json();
        showToast(`Failed: ${error.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      console.error("Failed to save category discount:", error);
      showToast("Failed to save category discount", "error");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategoryDiscount = async (category: string) => {
    if (!confirm(`Delete discount for ${category}?`)) return;

    try {
      const response = await fetch(
        `/api/admin/distributors/${selectedDistributor}/category-discounts`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
          credentials: "include"
        }
      );

      if (response.ok) {
        showToast("Category discount deleted!");
        await loadCategoryDiscounts();
      } else {
        showToast("Failed to delete category discount", "error");
      }
    } catch (error) {
      console.error("Failed to delete category discount:", error);
      showToast("Failed to delete category discount", "error");
    }
  };

  const handleSaveDefaultDiscount = async () => {
    if (!selectedDistributor) return;

    const discountValue = parseFloat(defaultDiscount);
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      showToast("Please enter a valid discount percentage (0-100)", "error");
      return;
    }

    setIsSavingDiscount(true);
    try {
      const response = await fetch(
        `/api/admin/distributors/${selectedDistributor}/default-discount`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ defaultDiscountPercent: discountValue }),
          credentials: "include"
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("API response:", data);

        // Update local state
        setDistributors(prev =>
          prev.map(d =>
            d.id === selectedDistributor
              ? { ...d, defaultDiscountPercent: discountValue }
              : d
          )
        );
        showToast("Default discount saved successfully!");
        // Reload data to ensure consistency
        await loadData();
      } else {
        const error = await response.json();
        showToast(`Failed to save: ${error.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      console.error("Failed to save default discount:", error);
      showToast("Failed to save default discount", "error");
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const selectedDist = distributors.find(d => d.id === selectedDistributor);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            B2B Pricing Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage distributor-specific pricing and quantity discounts
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Distributors List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold">Distributors</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {distributors.length} total
                </p>
              </div>
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {distributors.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p className="mb-2">No distributors found</p>
                    <p className="text-xs">Create distributor accounts first</p>
                  </div>
                ) : (
                  distributors.map(dist => (
                    <button
                      key={dist.id}
                      onClick={() => setSelectedDistributor(dist.id)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                        selectedDistributor === dist.id
                          ? "bg-blue-50 border-l-4 border-blue-500"
                          : ""
                      }`}
                    >
                      <div className="font-semibold text-gray-900">
                        {dist.companyName || dist.name || "No name"}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {dist.email}
                      </div>
                      <div className="text-xs mt-2 space-y-1">
                        {dist.defaultDiscountPercent !== null && (
                          <div className="text-green-600 font-medium">
                            Default: {dist.defaultDiscountPercent}%
                          </div>
                        )}
                        {dist._count.categoryDiscounts > 0 && (
                          <div className="text-purple-600 font-medium">
                            {dist._count.categoryDiscounts} category discount
                            {dist._count.categoryDiscounts !== 1 ? "s" : ""}
                          </div>
                        )}
                        {dist._count.distributorPrices > 0 && (
                          <div className="text-blue-600 font-medium">
                            {dist._count.distributorPrices} custom price
                            {dist._count.distributorPrices !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Products & Pricing */}
          <div className="lg:col-span-2">
            {!selectedDistributor ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">←</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Select a Distributor
                </h3>
                <p className="text-gray-600">
                  Choose a distributor from the list to manage their pricing
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b bg-gray-50">
                  <h2 className="text-xl font-semibold">
                    {selectedDist?.companyName || selectedDist?.name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDist?.email}
                  </p>
                </div>

                {/* Default Discount Section */}
                <div className="p-6 border-b bg-blue-50">
                  <h3 className="text-lg font-semibold mb-3">
                    Default Discount
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This discount applies to all products unless a specific
                    price is set below
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-xs">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={defaultDiscount}
                          onChange={e => setDefaultDiscount(e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-2 pr-8 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                          %
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleSaveDefaultDiscount}
                      disabled={isSavingDiscount}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                    >
                      {isSavingDiscount ? "Saving..." : "Save"}
                    </button>
                  </div>
                  {selectedDist?.defaultDiscountPercent && (
                    <p className="text-sm text-green-600 mt-3">
                      ✓ Current default discount:{" "}
                      {selectedDist.defaultDiscountPercent}%
                    </p>
                  )}
                </div>

                {/* Category Discount Section */}
                <div className="p-6 border-b bg-purple-50">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">
                      Category Discounts
                    </h3>
                    <p className="text-sm text-gray-600">
                      Set different discounts for specific product categories.{" "}
                      <span className="font-medium text-purple-600">
                        Overrides Default Discount.
                      </span>
                    </p>
                  </div>

                  {/* Existing category discounts */}
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
                            onClick={() =>
                              handleDeleteCategoryDiscount(cd.category)
                            }
                            className="text-red-600 hover:text-red-800 text-sm font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new category discount */}
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <select
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">Select category...</option>
                        {categories
                          .filter(
                            cat =>
                              !categoryDiscounts.find(cd => cd.category === cat)
                          )
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

                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">
                      Product Pricing
                    </h3>
                    <p className="text-sm text-gray-600">
                      Set custom prices or tiered pricing for specific products.{" "}
                      <span className="font-medium text-blue-600">
                        Overrides Category Discounts and Default Discount.
                      </span>
                    </p>
                  </div>

                  {products.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No products available
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {products.map(product => {
                        const pricing = distributorPricing.find(
                          p => p.product.id === product.id
                        );
                        const hasTiers =
                          pricing?.discountTiers &&
                          pricing.discountTiers.length > 0;

                        return (
                          <Link
                            key={product.id}
                            href={`/admin/b2b-pricing/${selectedDistributor}/${product.id}`}
                            className="block p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">
                                  {product.name}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  SKU: {product.sku} | Base Price: $
                                  {product.price.toLocaleString("en-US")}
                                </div>
                                {pricing && (
                                  <div className="mt-2 space-y-1">
                                    <div className="text-sm font-medium text-blue-600">
                                      Custom Price: $
                                      {pricing.customPrice.toFixed(2)}
                                    </div>
                                    {hasTiers && (
                                      <div className="text-xs text-gray-600">
                                        🎯 {pricing.discountTiers!.length} tier
                                        {pricing.discountTiers!.length !== 1
                                          ? "s"
                                          : ""}
                                        :
                                        {pricing.discountTiers!.map(
                                          (tier, idx) => (
                                            <span
                                              key={idx}
                                              className="ml-2 inline-block"
                                            >
                                              {tier.minQty}
                                              {tier.maxQty
                                                ? `-${tier.maxQty}`
                                                : "+"}
                                              qty → ${tier.price.toFixed(2)}
                                              {idx <
                                              pricing.discountTiers!.length - 1
                                                ? ","
                                                : ""}
                                            </span>
                                          )
                                        )}
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
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
