import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock tenant detection
vi.mock("@/lib/tenant", () => ({
  getTenantForHost: async (host: string) => ({
    id: "d1",
    name: "Chromet",
    logoUrl: null,
    brandColor: "#ff0000"
  })
}));

// Mock next-auth getServerSession to avoid request-scoped headers usage in tests
vi.mock("next-auth", () => ({
  getServerSession: async () => null
}));

// Mock pricing helper used for distributor-based pricing
vi.mock("@/lib/pricing", () => ({
  getProductPriceForDistributor: async (
    productId: string,
    distributorId: string
  ) => {
    // return a clear marker price to assert in test
    if (productId === "p1" && distributorId === "d1") return 90;
    return 0;
  },
  // keep other exports if needed
  getProductPrice: async () => 0
}));

// Mock prisma product listing
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: async () => [
        {
          id: "p1",
          name: "Widget",
          price: 100,
          description: "",
          sku: "W-1",
          category: "General"
        }
      ]
    }
  }
}));

import { GET } from "@/app/api/products/route";

describe("Products API tenant pricing", () => {
  it("applies distributor (tenant) pricing when x-tenant-host header is present", async () => {
    const req = new Request("/", {
      headers: new Headers([["x-tenant-host", "chromet.example:3000"]])
    });

    const res = await GET(req as any);
    const data = await res.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data[0].price).toBe(90); // 100 - 10 from mocked getProductPriceForDistributor
    expect(data[0].basePrice).toBe(100);
  });
});
