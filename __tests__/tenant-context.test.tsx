import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Targeted mock for html-encoding-sniffer in this test file only
vi.mock("html-encoding-sniffer", () => ({
  sniff: () => undefined,
  default: { sniff: () => undefined }
}));
import { TenantProviderClient, useTenant } from "@/components/tenant-context";

function ShowTenantName() {
  const tenant = useTenant();
  return <div>{tenant?.name ?? "no-tenant"}</div>;
}

describe("TenantProviderClient", () => {
  it("provides tenant to children via context", () => {
    render(
      <TenantProviderClient
        tenant={{
          id: "t1",
          name: "Chromet",
          logoUrl: null,
          brandColor: "#ff0000"
        }}
      >
        <ShowTenantName />
      </TenantProviderClient>
    );

    expect(screen.getByText("Chromet")).toBeInTheDocument();
  });
});
