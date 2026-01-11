import { getTenantForHost } from "@/lib/tenant";
import { getProductPriceForDistributor, getProductPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

async function main() {
  const host = "samsung.localhost:3000";
  const tenant = await getTenantForHost(host);
  console.log("Tenant for host:", tenant);

  const productId = "cmk7o2bxy000mxe5rxbr6yyn8";
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, price: true, category: true }
  });
  console.log("Product:", product);

  if (tenant) {
    const p = await getProductPriceForDistributor(productId, tenant.id, 1);
    console.log("Price for tenant:", p);
  }

  const p2 = await getProductPrice(productId, null, 1);
  console.log("Price for non-tenant:", p2);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
