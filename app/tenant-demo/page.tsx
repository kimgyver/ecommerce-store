import { headers } from "next/headers";
import Image from "next/image";
import { getTenantForHost } from "@/lib/tenant";
import { getProducts } from "@/lib/products-server";
import { getProductPriceForDistributor } from "@/lib/pricing";
import TenantDemoClient from "@/components/TenantDemoClient";

export default async function TenantDemoPage() {
  const h = (await Promise.resolve(headers())) as Headers;
  const host = (h.get("x-tenant-host") || h.get("host") || "") as string;
  const tenant = await getTenantForHost(host);

  const products = await getProducts();

  // Compute distributor-aware prices for demo (quantity = 1)
  const productsWithPrices = await Promise.all(
    products.map(async p => {
      const price = await getProductPriceForDistributor(
        p.id,
        tenant?.id || null,
        1
      );
      return {
        id: p.id,
        name: p.name,
        image: p.image,
        basePrice: p.price,
        price
      };
    })
  );

  return (
    <div style={{ padding: 24 }}>
      <h1>Tenant Demo</h1>
      {tenant ? (
        <div
          data-testid="tenant-wrapper"
          style={
            {
              "--tenant-accent": tenant.brandColor || "#0ea5a4"
            } as React.CSSProperties
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {tenant.logoUrl ? (
              // unoptimized for demo
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
                  background: tenant.brandColor || "#eee"
                }}
              />
            )}
            <div>
              <h2>{tenant.name}</h2>
              <div>
                Accent:{" "}
                <span data-testid="tenant-accent">{tenant.brandColor}</span>
              </div>
            </div>
          </div>

          <section style={{ marginTop: 24 }}>
            <h3>Products (demo distributor pricing)</h3>
            {/* TenantDemoClient is a client component that consumes tenant from context */}
            <TenantDemoClient products={productsWithPrices} />
          </section>
        </div>
      ) : (
        <div>No tenant detected for host: {host}</div>
      )}
    </div>
  );
}
