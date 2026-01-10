import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock tenant context provider so we can supply a tenant to the client component
vi.mock("@/components/tenant-context", () => {
  const React = require("react");
  return {
    TenantProviderClient: ({ tenant, children }: any) => (
      <div data-testid="tenant-provider" data-tenant={JSON.stringify(tenant)}>
        {children}
      </div>
    ),
    useTenant: () => ({
      id: "d1",
      name: "Chromet Inc.",
      logoUrl: null,
      brandColor: "#FF6B35"
    })
  };
});

import TenantDemoClient from "@/components/TenantDemoClient";
import { TenantProviderClient } from "@/components/tenant-context";

describe("TenantDemoClient", () => {
  it("renders tenant info and product prices with discount", () => {
    const products = [
      { id: "p1", name: "Keyboard", basePrice: 59.99, price: 47.99 },
      { id: "p2", name: "Laptop", basePrice: 1299.99, price: 1039.99 }
    ];

    render(
      <TenantProviderClient tenant={{ id: "d1" }}>
        <TenantDemoClient products={products} />
      </TenantProviderClient>
    );

    expect(screen.getByText(/Chromet Inc./)).toBeTruthy();
    // Accent color should be present in client render
    expect(screen.getByTestId("tenant-accent-client")).toHaveTextContent(
      "#FF6B35"
    );

    // Product prices should be shown (discounted)
    expect(screen.getByTestId("price-p1")).toHaveTextContent("47.99");
    expect(screen.getByTestId("price-p2")).toHaveTextContent("1039.99");
  });
});
