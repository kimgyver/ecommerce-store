"use client";

import React, { createContext, useContext } from "react";
import type { Tenant } from "@/lib/tenant";

const TenantContext = createContext<Tenant | null>(null);

export const TenantProviderClient: React.FC<{
  tenant?: Tenant | null;
  children: React.ReactNode;
}> = ({ tenant = null, children }) => {
  return (
    <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
  );
};

export function useTenant() {
  return useContext(TenantContext);
}
