"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Toast } from "@/components/toast";

interface Distributor {
  id: string;
  name: string;
  emailDomain: string;
  logoUrl: string | null;
  brandColor: string | null;
  defaultDiscountPercent: number | null;
  createdAt: string;
  _count: {
    users: number;
    distributorPrices: number;
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
  const [showAddDistributor, setShowAddDistributor] = useState(false);
  const [newDistributor, setNewDistributor] = useState({
    name: "",
    emailDomain: "",
    logoUrl: "",
    brandColor: "",
    defaultDiscountPercent: ""
  });
  const [isCreatingDistributor, setIsCreatingDistributor] = useState(false);
  const [editingDistributor, setEditingDistributor] = useState<string | null>(
    null
  );
  const [editDistributor, setEditDistributor] = useState({
    name: "",
    emailDomain: "",
    logoUrl: "",
    brandColor: ""
  });
  const [isUpdatingDistributor, setIsUpdatingDistributor] = useState(false);
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

  const handleCreateDistributor = async () => {
    if (!newDistributor.name || !newDistributor.emailDomain) {
      showToast("Name and email domain are required", "error");
      return;
    }

    const discountValue = newDistributor.defaultDiscountPercent
      ? parseFloat(newDistributor.defaultDiscountPercent)
      : null;

    if (
      discountValue !== null &&
      (isNaN(discountValue) || discountValue < 0 || discountValue > 100)
    ) {
      showToast("Please enter a valid discount percentage (0-100)", "error");
      return;
    }

    setIsCreatingDistributor(true);
    try {
      const response = await fetch("/api/admin/distributors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDistributor.name,
          emailDomain: newDistributor.emailDomain.toLowerCase(),
          logoUrl: newDistributor.logoUrl || null,
          brandColor: newDistributor.brandColor || null,
          defaultDiscountPercent: discountValue
        }),
        credentials: "include"
      });

      if (response.ok) {
        showToast("Distributor created successfully!");
        setShowAddDistributor(false);
        setNewDistributor({
          name: "",
          emailDomain: "",
          logoUrl: "",
          brandColor: "",
          defaultDiscountPercent: ""
        });
        await loadData();
      } else {
        const error = await response.json();
        showToast(`Failed: ${error.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      console.error("Failed to create distributor:", error);
      showToast("Failed to create distributor", "error");
    } finally {
      setIsCreatingDistributor(false);
    }
  };

  const handleUpdateDistributor = async () => {
    if (
      !editingDistributor ||
      !editDistributor.name ||
      !editDistributor.emailDomain
    ) {
      showToast("Name and email domain are required", "error");
      return;
    }

    setIsUpdatingDistributor(true);
    try {
      const response = await fetch(
        `/api/admin/distributors/${editingDistributor}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editDistributor.name,
            emailDomain: editDistributor.emailDomain.toLowerCase(),
            logoUrl: editDistributor.logoUrl || null,
            brandColor: editDistributor.brandColor || null
          }),
          credentials: "include"
        }
      );

      if (response.ok) {
        showToast("Distributor updated successfully!");
        setEditingDistributor(null);
        setEditDistributor({
          name: "",
          emailDomain: "",
          logoUrl: "",
          brandColor: ""
        });
        await loadData();
      } else {
        const error = await response.json();
        showToast(`Failed: ${error.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      console.error("Failed to update distributor:", error);
      showToast("Failed to update distributor", "error");
    } finally {
      setIsUpdatingDistributor(false);
    }
  };

  const handleDeleteDistributor = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/distributors/${id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (response.ok) {
        showToast("Distributor deleted successfully!");
        if (selectedDistributor === id) {
          setSelectedDistributor("");
        }
        await loadData();
      } else {
        const error = await response.json();
        showToast(`Failed: ${error.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      console.error("Failed to delete distributor:", error);
      showToast("Failed to delete distributor", "error");
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
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">Distributors</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {distributors.length} total
                  </p>
                </div>
                <button
                  onClick={() => setShowAddDistributor(!showAddDistributor)}
                  className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition font-medium"
                >
                  {showAddDistributor ? "✕" : "+ Add"}
                </button>
              </div>

              {/* Add Distributor Form */}
              {showAddDistributor && (
                <div className="p-4 border-b bg-green-50">
                  <h3 className="text-base font-semibold mb-3 text-green-900">
                    Create New Distributor
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newDistributor.name}
                        onChange={e =>
                          setNewDistributor({
                            ...newDistributor,
                            name: e.target.value
                          })
                        }
                        placeholder="TechCorp Inc."
                        className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email Domain <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newDistributor.emailDomain}
                        onChange={e =>
                          setNewDistributor({
                            ...newDistributor,
                            emailDomain: e.target.value
                          })
                        }
                        placeholder="techcorp.com"
                        className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Auto-links employees with @techcorp.com
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Logo URL (optional)
                      </label>
                      <input
                        type="text"
                        value={newDistributor.logoUrl}
                        onChange={e =>
                          setNewDistributor({
                            ...newDistributor,
                            logoUrl: e.target.value
                          })
                        }
                        placeholder="https://example.com/logo.png"
                        className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Brand Color (optional)
                      </label>
                      <input
                        type="text"
                        value={newDistributor.brandColor}
                        onChange={e =>
                          setNewDistributor({
                            ...newDistributor,
                            brandColor: e.target.value
                          })
                        }
                        placeholder="#0066CC"
                        className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Default Discount % (optional)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={newDistributor.defaultDiscountPercent}
                          onChange={e =>
                            setNewDistributor({
                              ...newDistributor,
                              defaultDiscountPercent: e.target.value
                            })
                          }
                          placeholder="10.00"
                          className="w-full px-3 py-1.5 text-sm border rounded-lg pr-8 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <span className="absolute right-2 top-1.5 text-gray-500 text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleCreateDistributor}
                        disabled={isCreatingDistributor}
                        className="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-medium"
                      >
                        {isCreatingDistributor ? "Creating..." : "Create"}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddDistributor(false);
                          setNewDistributor({
                            name: "",
                            emailDomain: "",
                            logoUrl: "",
                            brandColor: "",
                            defaultDiscountPercent: ""
                          });
                        }}
                        disabled={isCreatingDistributor}
                        className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 transition font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="divide-y max-h-[600px] overflow-y-auto">
                {distributors.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p className="mb-2">No distributors found</p>
                    <p className="text-xs">Create distributor accounts first</p>
                  </div>
                ) : (
                  distributors.map(dist => (
                    <div key={dist.id}>
                      {editingDistributor === dist.id ? (
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-500">
                          <h4 className="text-sm font-semibold mb-3 text-blue-900">
                            Edit Distributor
                          </h4>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Company Name
                              </label>
                              <input
                                type="text"
                                value={editDistributor.name}
                                onChange={e =>
                                  setEditDistributor({
                                    ...editDistributor,
                                    name: e.target.value
                                  })
                                }
                                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Email Domain
                              </label>
                              <input
                                type="text"
                                value={editDistributor.emailDomain}
                                onChange={e =>
                                  setEditDistributor({
                                    ...editDistributor,
                                    emailDomain: e.target.value
                                  })
                                }
                                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Logo URL
                              </label>
                              <input
                                type="text"
                                value={editDistributor.logoUrl}
                                onChange={e =>
                                  setEditDistributor({
                                    ...editDistributor,
                                    logoUrl: e.target.value
                                  })
                                }
                                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Brand Color
                              </label>
                              <input
                                type="text"
                                value={editDistributor.brandColor}
                                onChange={e =>
                                  setEditDistributor({
                                    ...editDistributor,
                                    brandColor: e.target.value
                                  })
                                }
                                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={handleUpdateDistributor}
                                disabled={isUpdatingDistributor}
                                className="flex-1 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
                              >
                                {isUpdatingDistributor ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingDistributor(null);
                                  setEditDistributor({
                                    name: "",
                                    emailDomain: "",
                                    logoUrl: "",
                                    brandColor: ""
                                  });
                                }}
                                disabled={isUpdatingDistributor}
                                className="px-2 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100 transition font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`relative group ${
                            selectedDistributor === dist.id
                              ? "bg-blue-50 border-l-4 border-blue-500"
                              : ""
                          }`}
                        >
                          <button
                            onClick={() => setSelectedDistributor(dist.id)}
                            className="w-full text-left p-4 hover:bg-gray-50 transition"
                          >
                            <div className="font-semibold text-gray-900">
                              {dist.name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              @{dist.emailDomain}
                            </div>
                            <div className="text-xs mt-2 space-y-1">
                              {dist._count.users > 0 && (
                                <div className="text-gray-600">
                                  👥 {dist._count.users} employee
                                  {dist._count.users !== 1 ? "s" : ""}
                                </div>
                              )}
                              {dist._count.distributorPrices > 0 && (
                                <div className="text-blue-600 font-medium">
                                  💰 {dist._count.distributorPrices} custom
                                  price
                                  {dist._count.distributorPrices !== 1
                                    ? "s"
                                    : ""}
                                </div>
                              )}
                            </div>
                          </button>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setEditingDistributor(dist.id);
                                setEditDistributor({
                                  name: dist.name,
                                  emailDomain: dist.emailDomain,
                                  logoUrl: dist.logoUrl || "",
                                  brandColor: dist.brandColor || ""
                                });
                              }}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteDistributor(dist.id, dist.name);
                              }}
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
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
                    {selectedDist?.name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    @{selectedDist?.emailDomain}
                  </p>
                </div>

                {/* Default Discount Section */}
                <div className="p-6 border-b bg-green-50">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">
                      Default Discount
                    </h3>
                    <p className="text-sm text-gray-600">
                      Fallback discount for all products without specific
                      pricing.{" "}
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
                        <span className="absolute right-3 top-2.5 text-gray-500">
                          %
                        </span>
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
                    selectedDist?.defaultDiscountPercent !== undefined && (
                      <div className="mt-3 p-3 bg-white rounded border border-green-200">
                        <p className="text-sm text-green-700">
                          ✓ Current:{" "}
                          <strong>
                            {selectedDist.defaultDiscountPercent}%
                          </strong>{" "}
                          discount on all products (unless overridden by
                          product/category pricing)
                        </p>
                      </div>
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
