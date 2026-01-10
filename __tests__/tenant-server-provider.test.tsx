import { describe, it, expect, vi } from "vitest";

// Mock headers() from next/headers to return a Headers-like object
vi.mock("next/headers", () => ({
  headers: () => ({
    get: (k: string) => (k === "x-tenant-host" ? "example.DIST:3000" : null)
  })
}));

// Mock the tenant lookup
vi.mock("@/lib/tenant", () => ({
  getTenantForHost: async (host: string) => ({ id: "d1", name: "Distr", host })
}));

import TenantServerProvider from "@/components/TenantServerProvider";

describe("TenantServerProvider", () => {
  it("resolves tenant from headers and passes it to TenantProviderClient", async () => {
    const res = await TenantServerProvider({ children: "child" });
    // The server component returns a React element; tenant should be in props
    expect(res.props.tenant).toMatchObject({ id: "d1", name: "Distr" });
    expect(res.props.children).toBe("child");
  });
});
