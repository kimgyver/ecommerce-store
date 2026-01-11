"use client";

import React from "react";
import Image from "next/image";
import { useTenant } from "@/components/tenant-context";

export default function TenantDemoClient({
  products
}: {
  products: Array<{
    id: string;
    name: string;
    image?: string | null;
    basePrice: number;
    price: number;
  }>;
}) {
  const tenant = useTenant();

  return (
    <div data-testid="tenant-demo-client">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {tenant?.logoUrl ? (
          <Image
            src={tenant.logoUrl}
            alt={tenant.name}
            width={64}
            height={64}
            unoptimized
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              background: tenant?.brandColor || "#eee"
            }}
          />
        )}
        <div>
          <h2>{tenant?.name}</h2>
          <div data-testid="tenant-accent-client">{tenant?.brandColor}</div>
        </div>
      </div>

      <ul style={{ marginTop: 16 }}>
        {products.map(p => (
          <li key={p.id} style={{ marginBottom: 8 }}>
            <strong>{p.name}</strong> —{" "}
            {p.basePrice !== p.price ? (
              <>
                <span
                  style={{ textDecoration: "line-through", marginRight: 8 }}
                >
                  ${p.basePrice.toFixed(2)}
                </span>
                <span data-testid={`price-${p.id}`}>${p.price.toFixed(2)}</span>
              </>
            ) : (
              <span data-testid={`price-${p.id}`}>${p.price.toFixed(2)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
