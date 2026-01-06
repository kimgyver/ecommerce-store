"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Distributor {
  id: string;
  email: string;
  name: string | null;
  companyName: string | null;
  phone: string | null;
  createdAt: string;
  _count: {
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

export default function B2BPricingPage() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set page title
    loadData();
  }, []);

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
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
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
                      <div className="text-xs text-blue-600 mt-2 font-medium">
                        {dist._count.distributorPrices} custom price
                        {dist._count.distributorPrices !== 1 ? "s" : ""}
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

                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Product Pricing
                  </h3>

                  {products.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No products available
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {products.map(product => (
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
                            </div>
                            <div className="text-blue-600 font-semibold">
                              Set Price →
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
