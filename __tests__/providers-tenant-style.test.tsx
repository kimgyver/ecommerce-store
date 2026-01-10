import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Use TenantProviderClient to provide tenant to Providers
vi.mock("@/components/tenant-context", () => {
  const React = require("react");
  return {
    TenantProviderClient: ({ tenant, children }: any) => (
      <div data-testid="tenant-provider" data-tenant={JSON.stringify(tenant)}>
        {children}
      </div>
    ),
    useTenant: () => ({})
  };
});

// Mock next/navigation (usePathname used by Providers/Header)
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() })
}));

import { Providers } from "@/components/providers";
import { TenantProviderClient } from "@/components/tenant-context";

import Header from "@/components/header"; // ensure header import doesn't break tests

describe("Providers tenant style injection", () => {
  beforeEach(() => {
    // Stub global fetch to avoid network calls from nested providers during render
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) } as any))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("injects --tenant-accent style when tenant is present and Header is inside wrapper", () => {
    const tenant = {
      id: "d1",
      name: "Chromet Inc.",
      logoUrl: null,
      brandColor: "#FF6B35"
    };

    render(
      <TenantProviderClient tenant={tenant}>
        <Providers>
          <div>child</div>
        </Providers>
      </TenantProviderClient>
    );

    // The element with the CSS variable should exist
    const wrapper = document.querySelector("div[style*='--tenant-accent']");
    expect(wrapper).toBeTruthy();
    // And header should be present inside the wrapper
    expect(screen.getByText(/Chromet Inc.|Store/)).toBeTruthy();
  });
});
