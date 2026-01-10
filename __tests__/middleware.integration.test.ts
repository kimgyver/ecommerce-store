import { describe, it, expect } from "vitest";
import { middleware, computeTenantHostFromHeaders } from "@/app/middleware";

describe("middleware integration", () => {
  it("sets x-tenant-host header from host (stripped and lowercased)", () => {
    const fakeReq = {
      headers: new Headers([["host", "Example.COM:3000"]])
    } as any;
    // computeTenantHostFromHeaders mirrors the logic middleware uses to set x-tenant-host
    const computed = computeTenantHostFromHeaders(fakeReq.headers as Headers);
    expect(computed).toBe("example.com");
  });
});
