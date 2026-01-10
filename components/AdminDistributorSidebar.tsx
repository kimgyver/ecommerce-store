"use client";

import React from "react";

interface DistributorSummary {
  id: string;
  name: string;
  emailDomain: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  _count: {
    users: number;
    distributorPrices: number;
  };
}

interface Props {
  distributors: DistributorSummary[];
  selectedDistributor: string;
  setSelectedDistributor: (id: string) => void;
  showAddDistributor: boolean;
  setShowAddDistributor: (v: boolean) => void;
  newDistributor: {
    name: string;
    emailDomain: string;
    logoUrl: string;
    brandColor: string;
    defaultDiscountPercent: string;
  };
  setNewDistributor: (u: any) => void;
  isCreatingDistributor: boolean;
  handleCreateDistributor: () => Promise<void>;
  editingDistributor: string | null;
  setEditingDistributor: (id: string | null) => void;
  editDistributor: {
    name: string;
    emailDomain: string;
    logoUrl: string;
    brandColor: string;
  };
  setEditDistributor: (d: any) => void;
  handleUpdateDistributor: () => Promise<void>;
  handleDeleteDistributor: (id: string, name: string) => Promise<void>;
}

export default function AdminDistributorSidebar({
  distributors,
  selectedDistributor,
  setSelectedDistributor,
  showAddDistributor,
  setShowAddDistributor,
  newDistributor,
  setNewDistributor,
  isCreatingDistributor,
  handleCreateDistributor,
  editingDistributor,
  setEditingDistributor,
  editDistributor,
  setEditDistributor,
  handleUpdateDistributor,
  handleDeleteDistributor
}: Props) {
  return (
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

              {/* Optional fields intentionally removed from this quick-create UI */}

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
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleUpdateDistributor}
                          disabled={false}
                          className="flex-1 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
                        >
                          Save
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
                            💰 {dist._count.distributorPrices} custom price
                            {dist._count.distributorPrices !== 1 ? "s" : ""}
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
  );
}
