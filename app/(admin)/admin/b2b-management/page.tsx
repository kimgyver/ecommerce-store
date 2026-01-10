"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminDistributorSidebar from "@/components/AdminDistributorSidebar";
import CompanyTabs from "@/components/CompanyTabs";
import { Toast } from "@/components/toast";

interface Distributor {
  id: string;
  name: string;
  emailDomain: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  defaultDiscountPercent?: number | null;
  _count?: { users: number; distributorPrices: number };
}

export default function Page() {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDistributor, setSelectedDistributor] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Company fields
  const [companyName, setCompanyName] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [cname, setCname] = useState("");

  // Pricing fields (delegated to CompanyTabs/PricingPanel)
  const [defaultDiscount, setDefaultDiscount] = useState("");
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [categoryDiscounts, setCategoryDiscounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryDiscount, setNewCategoryDiscount] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [distributorPricing, setDistributorPricing] = useState<any[]>([]);
  const [domains, setDomains] = useState<
    import("@/types/distributor").DistributorDomain[]
  >([]);
  // Add-distributor UI state
  const [showAddDistributor, setShowAddDistributor] = useState(false);
  const [newDistributor, setNewDistributor] = useState({
    name: "",
    emailDomain: "",
    logoUrl: "",
    brandColor: "",
    defaultDiscountPercent: ""
  });
  const [isCreatingDistributor, setIsCreatingDistributor] = useState(false);
  // Edit-distributor UI state
  const [editingDistributor, setEditingDistributor] = useState<string | null>(
    null
  );
  const [editDistributor, setEditDistributor] = useState({
    name: "",
    emailDomain: "",
    logoUrl: "",
    brandColor: ""
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dRes, pRes] = await Promise.all([
        fetch("/api/admin/distributors", { credentials: "include" }),
        fetch("/api/products", { credentials: "include" })
      ]);

      if (dRes.ok) {
        const dData = await dRes.json();
        setDistributors(dData.distributors || []);
      }

      if (pRes.ok) {
        const pData = await pRes.json();
        const productList = Array.isArray(pData) ? pData : pData.products || [];
        setProducts(productList);
        const cats = Array.from(
          new Set((productList || []).map((p: any) => p.category))
        ).filter(Boolean);
        setCategories(cats as string[]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const productList = Array.isArray(data) ? data : data.products || [];
        setProducts(productList);
        const cats = Array.from(
          new Set((productList || []).map((p: any) => p.category))
        ).filter(Boolean);
        setCategories(cats as string[]);
      } else {
        console.warn("Failed to load products: non-ok response");
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // If distributor query param is present, select it
  const searchParams = useSearchParams();
  useEffect(() => {
    const distributor = searchParams?.get("distributor");
    if (distributor) setSelectedDistributor(distributor);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedDistributor) return;

    // populate company fields when selection changes
    const dist = distributors.find(d => d.id === selectedDistributor);
    if (dist) {
      setCompanyName(dist.name || "");
      setEmailDomain(dist.emailDomain || "");
      setLogoUrl(dist.logoUrl || "");
      setBrandColor(dist.brandColor || "");
    }

    // load related data
    loadCategoryDiscounts();
    loadDistributorPricing();
    loadDomains();
    // ensure products are loaded (in case initial load failed)
    if (products.length === 0) {
      loadProducts();
    }
  }, [selectedDistributor, distributors]);

  const loadDomains = async () => {
    if (!selectedDistributor) return;
    try {
      const res = await fetch(
        `/api/admin/distributors/${selectedDistributor}/domains`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        const list = data.domains || [];
        setDomains(list);
        // If current cname already exists in list, keep it (don't override user's input)
        const current = cname;
        const hasCurrent =
          current && list.some((d: any) => d.domain === current);
        if (!hasCurrent) {
          // prefer a verified domain, otherwise first domain
          const verified = list.find((d: any) => d.status === "verified");
          const pick = verified || list[0] || null;
          setCname(pick ? pick.domain : "");
        }
      }
    } catch (err) {
      console.error("Failed to load domains:", err);
    }
  };

  const loadCategoryDiscounts = async () => {
    if (!selectedDistributor) return;

    try {
      const res = await fetch(
        `/api/admin/distributors/${selectedDistributor}/category-discounts`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setCategoryDiscounts(data.categoryDiscounts || []);
      }
    } catch (err) {
      console.error("Failed to load category discounts:", err);
    }
  };

  const loadDistributorPricing = async () => {
    if (!selectedDistributor) return;

    try {
      const res = await fetch(`/api/admin/b2b-pricing/${selectedDistributor}`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setDistributorPricing(data.pricingRules || []);
      }
    } catch (err) {
      console.error("Failed to load distributor pricing:", err);
    }
  };

  const handleSaveDefaultDiscount = async () => {
    if (!selectedDistributor)
      return showToast("No distributor selected", "error");

    const discountValue = parseFloat(defaultDiscount);
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      return showToast(
        "Please enter a valid discount percentage (0-100)",
        "error"
      );
    }

    setIsSavingDiscount(true);
    try {
      const payload = {
        defaultDiscountPercent: discountValue > 0 ? discountValue : null
      };
      const res = await fetch(
        `/api/admin/distributors/${selectedDistributor}/default-discount`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include"
        }
      );

      if (res.ok) {
        // update local distributors list
        setDistributors(prev =>
          prev.map(d =>
            d.id === selectedDistributor
              ? { ...d, defaultDiscountPercent: payload.defaultDiscountPercent }
              : d
          )
        );
        showToast(
          discountValue > 0
            ? "Default discount saved successfully!"
            : "Default discount removed",
          "success"
        );
      } else {
        const err = await res.json();
        showToast(`Failed: ${err.error || "Unknown error"}`, "error");
      }
    } catch (err) {
      console.error("Failed to save default discount:", err);
      showToast("Failed to save default discount", "error");
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const handleSaveCategoryDiscount = async () => {
    if (!selectedDistributor || !newCategory || !newCategoryDiscount) {
      return showToast(
        "Please select a category and enter a discount percentage",
        "error"
      );
    }

    const discountValue = parseFloat(newCategoryDiscount);
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      return showToast(
        "Please enter a valid discount percentage (0-100)",
        "error"
      );
    }

    setIsSavingCategory(true);
    try {
      const res = await fetch(
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

      if (res.ok) {
        showToast("Category discount saved!", "success");
        setNewCategory("");
        setNewCategoryDiscount("");
        await loadCategoryDiscounts();
      } else {
        const err = await res.json();
        showToast(`Failed: ${err.error || "Unknown error"}`, "error");
      }
    } catch (err) {
      console.error("Failed to save category discount:", err);
      showToast("Failed to save category discount", "error");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategoryDiscount = async (category: string) => {
    if (!selectedDistributor) return;
    if (!confirm(`Delete discount for ${category}?`)) return;

    try {
      const res = await fetch(
        `/api/admin/distributors/${selectedDistributor}/category-discounts`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
          credentials: "include"
        }
      );

      if (res.ok) {
        showToast("Category discount deleted!", "success");
        await loadCategoryDiscounts();
      } else {
        showToast("Failed to delete category discount", "error");
      }
    } catch (err) {
      console.error("Failed to delete category discount:", err);
      showToast("Failed to delete category discount", "error");
    }
  };

  const handleCreateDistributor = async () => {
    // Basic validation
    if (!newDistributor.name || !newDistributor.emailDomain) {
      return showToast("Name and email domain are required", "error");
    }

    setIsCreatingDistributor(true);
    try {
      const res = await fetch("/api/admin/distributors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newDistributor.name,
          emailDomain: newDistributor.emailDomain.toLowerCase(),
          logoUrl: newDistributor.logoUrl || null,
          brandColor: newDistributor.brandColor || null,
          defaultDiscountPercent:
            newDistributor.defaultDiscountPercent !== ""
              ? parseFloat(newDistributor.defaultDiscountPercent)
              : null
        })
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.distributor || data;
        showToast("Distributor created", "success");
        setShowAddDistributor(false);
        setNewDistributor({
          name: "",
          emailDomain: "",
          logoUrl: "",
          brandColor: "",
          defaultDiscountPercent: ""
        });
        await loadData();
        if (created?.id) setSelectedDistributor(created.id);
      } else {
        const err = await res.json();
        showToast(`Failed to create: ${err.error || "Unknown"}`, "error");
      }
    } catch (err) {
      console.error("Failed to create distributor:", err);
      showToast("Failed to create distributor", "error");
    } finally {
      setIsCreatingDistributor(false);
    }
  };

  const handleUpdateDistributor = async () => {
    if (!selectedDistributor)
      return showToast("No distributor selected", "error");

    if (!companyName || !emailDomain) {
      return showToast("Company name and email domain are required", "error");
    }

    setIsSavingCompany(true);
    try {
      const response = await fetch(
        `/api/admin/distributors/${selectedDistributor}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: companyName,
            emailDomain: emailDomain.toLowerCase(),
            logoUrl: logoUrl || null,
            brandColor: brandColor || null
          }),
          credentials: "include"
        }
      );

      if (response.ok) {
        const updated = await response.json();
        const updatedDist = updated.distributor || updated;
        setDistributors(prev =>
          prev.map(d =>
            d.id === selectedDistributor ? { ...d, ...updatedDist } : d
          )
        );
        showToast("Company saved", "success");
      } else {
        const err = await response.json();
        showToast(`Failed: ${err.error || "Unknown error"}`, "error");
      }
    } catch (error) {
      console.error("Failed to update distributor", error);
      showToast("Failed to save company", "error");
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleDeleteDistributor = async (_id: string, _name: string) => {
    showToast("Not implemented", "error");
  };

  const handleAddDomain = async (
    domain: string
  ): Promise<import("@/types/distributor").DistributorDomain | null> => {
    if (!selectedDistributor) {
      showToast("No distributor selected", "error");
      return null;
    }
    if (!domain) {
      showToast("Domain is required", "error");
      return null;
    }

    try {
      const res = await fetch(
        `/api/admin/distributors/${selectedDistributor}/domains`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ domain })
        }
      );

      if (res.ok) {
        const data = await res.json();
        const created = data.domain || data;
        showToast("Domain added", "success");
        // ensure the newly created domain becomes the current cname
        if (created?.domain) setCname(created.domain);
        await loadDomains();
        return created as import("@/types/distributor").DistributorDomain;
      } else {
        const err = await res.json();
        showToast(`Failed to add domain: ${err.error || "Unknown"}`, "error");
        return null;
      }
    } catch (err) {
      console.error("Failed to add domain:", err);
      showToast("Failed to add domain", "error");
      return null;
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    if (!selectedDistributor) return null;
    try {
      const res = await fetch(
        `/api/admin/distributors/${selectedDistributor}/domains/${domainId}/verify`,
        { method: "POST", credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        const updated = data.domain || data;
        // keep the user's current cname on verify by setting it to the verified domain
        if (updated?.domain) setCname(updated.domain);
        await loadDomains();
        return updated;
      } else {
        const err = await res.json();
        showToast(`Verify failed: ${err.error || "Unknown"}`, "error");
        return null;
      }
    } catch (err) {
      console.error("Verify domain error:", err);
      showToast("Verify failed", "error");
      return null;
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    if (!selectedDistributor)
      return showToast("No distributor selected", "error");
    try {
      const res = await fetch(
        `/api/admin/distributors/${selectedDistributor}/domains/${domainId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        showToast("Domain deleted", "success");
        // if deleted domain matches current cname, clear it
        const dom = domains.find((d: any) => d.id === domainId);
        if (dom && dom.domain === cname) setCname("");
        await loadDomains();
      } else {
        const err = await res.json();
        showToast(
          `Failed to delete domain: ${err.error || "Unknown"}`,
          "error"
        );
      }
    } catch (err) {
      console.error("Failed to delete domain:", err);
      showToast("Failed to delete domain", "error");
    }
  };

  const handleUpdateDistributorSidebar = async () => {
    if (!editingDistributor)
      return showToast("No distributor selected", "error");
    if (!editDistributor.name || !editDistributor.emailDomain) {
      return showToast("Name and email domain are required", "error");
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/distributors/${editingDistributor}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editDistributor.name,
          emailDomain: editDistributor.emailDomain.toLowerCase(),
          logoUrl: editDistributor.logoUrl || null,
          brandColor: editDistributor.brandColor || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.distributor || data;
        setDistributors(prev =>
          prev.map(d =>
            d.id === editingDistributor ? { ...d, ...updated } : d
          )
        );
        showToast("Distributor updated", "success");
        setEditingDistributor(null);
        setEditDistributor({
          name: "",
          emailDomain: "",
          logoUrl: "",
          brandColor: ""
        });
      } else {
        const err = await res.json();
        showToast(`Failed to update: ${err.error || "Unknown"}`, "error");
      }
    } catch (err) {
      console.error("Failed to update distributor:", err);
      showToast("Failed to update distributor", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">B2B Management</h1>
          <p className="text-gray-600 mt-2">
            Manage distributors and company settings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <AdminDistributorSidebar
          distributors={distributors as any}
          selectedDistributor={selectedDistributor}
          setSelectedDistributor={setSelectedDistributor}
          showAddDistributor={showAddDistributor}
          setShowAddDistributor={setShowAddDistributor}
          newDistributor={newDistributor}
          setNewDistributor={setNewDistributor}
          isCreatingDistributor={isCreatingDistributor}
          handleCreateDistributor={handleCreateDistributor}
          editingDistributor={editingDistributor}
          setEditingDistributor={setEditingDistributor}
          editDistributor={editDistributor}
          setEditDistributor={setEditDistributor}
          handleUpdateDistributor={handleUpdateDistributorSidebar}
          handleDeleteDistributor={handleDeleteDistributor}
        />

        <div className="lg:col-span-2">
          {selectedDistributor ? (
            <CompanyTabs
              selectedDist={distributors.find(
                d => d.id === selectedDistributor
              )}
              selectedDistributor={selectedDistributor}
              companyName={companyName}
              setCompanyName={setCompanyName}
              emailDomain={emailDomain}
              setEmailDomain={setEmailDomain}
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              brandColor={brandColor}
              setBrandColor={setBrandColor}
              cname={cname}
              setCname={setCname}
              onSaveCompany={handleUpdateDistributor}
              isSavingCompany={isSavingCompany}
              defaultDiscount={defaultDiscount}
              setDefaultDiscount={setDefaultDiscount}
              isSavingDiscount={isSavingDiscount}
              handleSaveDefaultDiscount={handleSaveDefaultDiscount}
              categoryDiscounts={categoryDiscounts}
              categories={categories}
              newCategory={newCategory}
              setNewCategory={setNewCategory}
              newCategoryDiscount={newCategoryDiscount}
              setNewCategoryDiscount={setNewCategoryDiscount}
              isSavingCategory={isSavingCategory}
              handleSaveCategoryDiscount={handleSaveCategoryDiscount}
              handleDeleteCategoryDiscount={handleDeleteCategoryDiscount}
              products={products}
              distributorPricing={distributorPricing}
              onReloadProducts={loadProducts}
              onReloadPricing={loadDistributorPricing}
              handleAddDomain={handleAddDomain}
              onDeleteDomain={handleDeleteDomain}
              domains={domains}
              onVerifyDomain={handleVerifyDomain}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">←</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Select a Distributor
              </h3>
              <p className="text-gray-600">
                Choose a distributor from the list to manage their company and
                pricing settings
              </p>
            </div>
          )}
        </div>
      </div>

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
