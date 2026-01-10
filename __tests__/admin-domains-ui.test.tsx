import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, beforeEach, vi } from "vitest";

import B2BPricingPage from "@/app/(admin)/admin/b2b-pricing/page";

describe("Admin Domains UI", () => {
  let domainsState: Array<any> = [];

  beforeEach(() => {
    domainsState = [];

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo, init?: RequestInit) => {
        const url = String(input);

        if (url.endsWith("/api/admin/distributors")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              distributors: [
                {
                  id: "dist1",
                  name: "Chromet Inc.",
                  emailDomain: "chromet.com",
                  logoUrl: null,
                  brandColor: "#FF6B35",
                  defaultDiscountPercent: null,
                  _count: { users: 0, distributorPrices: 0 }
                }
              ]
            })
          } as any);
        }

        if (url.endsWith("/api/products")) {
          return Promise.resolve({ ok: true, json: async () => [] } as any);
        }

        if (
          url.endsWith("/domains") &&
          (!init?.method || init.method === "GET")
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ domains: domainsState })
          } as any);
        }

        if (url.endsWith("/domains") && init?.method === "POST") {
          const body = JSON.parse(String(init?.body));
          const newDomain = {
            id: `d${domainsState.length + 1}`,
            domain: body.domain,
            status: "pending"
          };
          domainsState.push(newDomain);
          return Promise.resolve({
            ok: true,
            json: async () => ({ domain: newDomain })
          } as any);
        }

        if (url.endsWith("/verify") && init?.method === "POST") {
          // simulate verification by setting first domain to verified and update lastCheckedAt
          if (domainsState.length > 0) {
            domainsState[0].status = "verified";
            domainsState[0].lastCheckedAt = new Date().toISOString();
          }
          return Promise.resolve({ ok: true, json: async () => ({}) } as any);
        }

        if (init?.method === "DELETE") {
          const parts = url.split("/");
          const domainId = parts[parts.length - 1];
          domainsState = domainsState.filter(d => d.id !== domainId);
          return Promise.resolve({ ok: true, json: async () => ({}) } as any);
        }

        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "not found" })
        } as any);
      })
    );
  });

  it("adds and verifies a domain", async () => {
    render(<B2BPricingPage />);

    // select distributor after load
    await waitFor(() => expect(screen.getByText(/Chromet Inc\./)).toBeTruthy());
    await userEvent.click(screen.getByText(/Chromet Inc\./));

    // Enter domain and add
    await waitFor(() => expect(screen.getByPlaceholderText("example.com")));
    const input = screen.getByPlaceholderText("example.com");
    await userEvent.type(input, "example.com");
    // click the Add button next to the input (there are other Add buttons on the page)
    const addBtn = input.parentElement?.querySelector("button");
    if (!addBtn) throw new Error("Add button not found next to domain input");
    await userEvent.click(addBtn);

    // wait for domain to appear
    await waitFor(() => expect(screen.getByText("example.com")).toBeTruthy());
    // status badge should be visible (pending initially)
    expect(screen.getByText(/pending/i)).toBeTruthy();

    // Click verify
    userEvent.click(screen.getByText("Verify"));

    // status should update to verified
    await waitFor(() => expect(screen.getByText(/verified/i)).toBeTruthy());
    // lastCheckedAt should be rendered
    await waitFor(() =>
      expect(screen.getByText(/Last checked:/i)).toBeTruthy()
    );

    // Branding tab: should show Company Name input when selected
    await userEvent.click(screen.getByText("Branding"));
    await waitFor(() =>
      expect(screen.getByLabelText(/Company Name/i)).toBeTruthy()
    );

    // Domains tab: Category Discounts should NOT be visible
    await userEvent.click(screen.getByText("Domains"));
    expect(screen.queryByText(/Category Discounts/i)).toBeNull();

    // Pricing tab: Default Discount should be visible
    await userEvent.click(screen.getByText("Pricing"));
    await waitFor(() =>
      expect(screen.getByText(/Default Discount/i)).toBeTruthy()
    );
  });
});
