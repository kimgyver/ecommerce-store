"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Toast } from "@/components/toast";

interface ProductFormProps {
  initialData?: {
    id: string;
    sku: string;
    name: string;
    description: string;
    price: number;
    image: string;
    category: string;
    stock: number;
  };
  isEditing?: boolean;
}

export default function ProductForm({
  initialData,
  isEditing = false
}: ProductFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(initialData?.image || "");
  const [formData, setFormData] = useState({
    sku: initialData?.sku || "",
    name: initialData?.name || "",
    description: initialData?.description || "",
    price: initialData?.price || 0,
    image: (initialData?.image || "") as File | string,
    category: initialData?.category || "electronics",
    stock: initialData?.stock || 0
  });
  const [error, setError] = useState("");
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

  const categories = [
    "electronics",
    "clothing",
    "books",
    "home",
    "sports",
    "toys",
    "other"
  ];

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]:
        name === "price" || name === "stock" ? parseFloat(value) || 0 : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a preview for UI
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Store the file for upload
      setFormData(prev => ({ ...prev, image: file as File }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.name.trim()) {
      setError("Product name is required");
      return;
    }
    if (!isEditing && !formData.sku.trim()) {
      setError("SKU is required");
      return;
    }
    if (formData.price < 0) {
      setError("Price cannot be negative");
      return;
    }
    if (formData.stock < 0) {
      setError("Stock cannot be negative");
      return;
    }
    // Image is required only when creating new product
    if (!isEditing && !formData.image) {
      setError("Product image is required");
      return;
    }

    setIsLoading(true);

    try {
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing
        ? `/api/products/${initialData?.id}`
        : "/api/products";

      // Create FormData for file upload
      const submitData = new FormData();
      if (!isEditing) {
        submitData.append("sku", formData.sku);
      }
      submitData.append("name", formData.name);
      submitData.append("description", formData.description);
      submitData.append("price", String(formData.price));
      submitData.append("category", formData.category);
      submitData.append("stock", String(formData.stock));

      // Handle image: if it's a File object, append it; otherwise use the existing URL
      if (formData.image instanceof File) {
        console.log("Appending new image file:", formData.image);
        submitData.append("image", formData.image);
      } else if (typeof formData.image === "string" && formData.image) {
        // When editing and image hasn't changed, send the existing URL
        console.log("Appending existing image URL:", formData.image);
        submitData.append("existingImage", formData.image);
      }

      console.log("Submitting form data:", {
        url,
        method,
        name: formData.name,
        stock: formData.stock,
        price: formData.price
      });

      const response = await fetch(url, {
        method,
        body: submitData
        // Don't set Content-Type header, browser will set it with boundary
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log("Error response:", errorData);
        setError(errorData.error || "Failed to save product");
        setIsLoading(false);
        return;
      }

      const responseData = await response.json();
      console.log("Success response data:", responseData);

      showToast(
        isEditing
          ? "Product updated successfully"
          : "Product created successfully"
      );

      // Redirect after showing toast
      setTimeout(() => {
        router.push("/admin/products");
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error("Error saving product:", error);
      setError("An error occurred while saving the product");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">
        {isEditing ? "Edit Product" : "Add New Product"}
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
        {/* Product Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter product name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* SKU */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SKU (Stock Keeping Unit) *
          </label>
          {isEditing ? (
            <div className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-mono">
              {formData.sku}
              <span className="ml-2 text-xs text-gray-500">(Read-only)</span>
            </div>
          ) : (
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleInputChange}
              placeholder="e.g., ELEC-001, COMP-LAPTOP-01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              required
            />
          )}
          <p className="text-xs text-gray-500 mt-1">
            {isEditing
              ? "SKU cannot be changed after creation to maintain data integrity"
              : "Unique identifier for inventory management (cannot be changed later)"}
          </p>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter product description"
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Price and Stock */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price ($) *
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Quantity *
            </label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Image Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Image *
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            {previewImage ? (
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <Image
                    src={previewImage}
                    alt="Product preview"
                    fill
                    className="object-cover rounded"
                  />
                </div>
                <label className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-800 font-medium">
                    Change Image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <label className="cursor-pointer">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-14-8l-4-4m0 0l-4 4m4-4v12m-14 8h12m6-6a2 2 0 11-4 0 2 2 0 014 0z"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    Click to upload an image
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  required
                />
              </label>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isLoading
              ? "Saving..."
              : isEditing
              ? "Update Product"
              : "Create Product"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </form>

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
