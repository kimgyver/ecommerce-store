import { getTenantForHost } from "@/lib/tenant";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getProductPriceForDistributor } from "@/lib/pricing";

export default async function PriceDemoPage() {
  // `headers()` can be async (returns a Promise-like) in some runtimes — await it
  const h = (await Promise.resolve(headers())) as Headers;
  const host = (h.get("host") || "") as string;
  const tenant = await getTenantForHost(host);

  // pick a sample product
  const product = await prisma.product.findFirst({
    select: { id: true, name: true, price: true }
  });
  if (!product) return <div>No products available</div>;

  const distributorId = tenant?.id || null;
  const distributorPrice = await getProductPriceForDistributor(
    product.id,
    distributorId,
    1
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tenant Price Demo</h1>
      <p>Host: {host}</p>
      <p>Tenant: {tenant?.name ?? "(none)"}</p>

      <div className="mt-4 p-4 border rounded bg-white">
        <h2 className="font-semibold">{product.name}</h2>
        <p>Base price: ${product.price.toFixed(2)}</p>
        <p className="mt-2">
          Effective price for tenant: ${distributorPrice.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
