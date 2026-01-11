"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import CompanyBasics from "@/components/CompanyBasics";
import DomainsOnboarding from "@/components/DomainsOnboarding";
import type { DistributorDomain } from "@/types/distributor";
import PricingPanel from "@/components/PricingPanel";

interface Distributor {
  id: string;
  name: string;
  emailDomain: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  defaultDiscountPercent?: number | null;
}

interface Props {
  selectedDist?: Distributor;
  selectedDistributor: string;
  // company fields
  companyName: string;
  setCompanyName: (v: string) => void;
  emailDomain: string;
  setEmailDomain: (v: string) => void;
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  brandColor: string;
  setBrandColor: (v: string) => void;
  cname: string;
  setCname: (v: string) => void;
  domains?: DistributorDomain[];
  onVerifyDomain?: (
    domainId: string
  ) => Promise<import("@/types/distributor").DistributorDomain | null>;
  onSaveCompany?: () => Promise<void> | void;
  isSavingCompany?: boolean;
  // pricing props (forwarded)
  defaultDiscount: string;
  setDefaultDiscount: (v: string) => void;
  isSavingDiscount: boolean;
  handleSaveDefaultDiscount: () => Promise<void>;
  categoryDiscounts: any[];
  categories: string[];
  newCategory: string;
  setNewCategory: (s: string) => void;
  newCategoryDiscount: string;
  setNewCategoryDiscount: (s: string) => void;
  isSavingCategory: boolean;
  handleSaveCategoryDiscount: () => Promise<void>;
  handleDeleteCategoryDiscount: (category: string) => Promise<void>;
  products: any[];
  distributorPricing: any[];
  onReloadProducts?: () => Promise<void>;
  onReloadPricing?: () => Promise<void>;
  handleAddDomain?: (
    domain: string
  ) => Promise<import("@/types/distributor").DistributorDomain | null>;
  onDeleteDomain?: (domainId: string) => Promise<void>;
}

export default function CompanyTabs({
  selectedDist,
  selectedDistributor,
  companyName,
  setCompanyName,
  emailDomain,
  setEmailDomain,
  logoUrl,
  setLogoUrl,
  brandColor,
  setBrandColor,
  cname,
  setCname,
  onSaveCompany,
  isSavingCompany,
  domains,
  onVerifyDomain,
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
  onReloadPricing,
  handleAddDomain,
  onDeleteDomain
}: Props) {
  const [tab, setTab] = useState<"company" | "pricing" | "preview">("company");
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams?.get("tab");
    if (t === "pricing" || t === "preview" || t === "company") {
      setTab(t as "company" | "pricing" | "preview");
    }
  }, [searchParams]);

  return (
    <div>
      <div className="mb-4 border-b">
        <nav className="flex gap-2">
          <button
            onClick={() => setTab("company")}
            className={`px-3 py-2 rounded-t-lg ${
              tab === "company" ? "bg-white border border-b-0" : "bg-gray-100"
            }`}
          >
            Company
          </button>
          <button
            onClick={() => setTab("pricing")}
            className={`px-3 py-2 rounded-t-lg ${
              tab === "pricing" ? "bg-white border border-b-0" : "bg-gray-100"
            }`}
          >
            Pricing
          </button>
          <button
            onClick={() => setTab("preview")}
            className={`px-3 py-2 rounded-t-lg ${
              tab === "preview" ? "bg-white border border-b-0" : "bg-gray-100"
            }`}
          >
            Preview
          </button>
        </nav>
      </div>

      <div className="p-4 bg-gray-50 rounded-b-lg">
        {tab === "company" && (
          <div className="space-y-4">
            <CompanyBasics
              name={companyName}
              setName={setCompanyName}
              emailDomain={emailDomain}
              setEmailDomain={setEmailDomain}
              onSave={onSaveCompany}
              isSaving={isSavingCompany}
            />
            <DomainsOnboarding
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              brandColor={brandColor}
              setBrandColor={setBrandColor}
              cname={cname}
              setCname={setCname}
              onSave={onSaveCompany}
              onAddDomain={handleAddDomain}
              domains={domains}
              onVerifyDomain={onVerifyDomain}
              onDeleteDomain={onDeleteDomain}
              isSaving={isSavingCompany}
            />
          </div>
        )}

        {tab === "pricing" && (
          <PricingPanel
            selectedDist={selectedDist}
            selectedDistributor={selectedDistributor}
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
            onReloadProducts={onReloadProducts}
            onReloadPricing={onReloadPricing}
          />
        )}

        {tab === "preview" && (
          <div className="p-6 bg-white rounded-lg shadow">
            Preview content for the selected distributor will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
