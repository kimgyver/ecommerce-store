import { PrismaClient } from "@prisma/client";
import { getProductPriceForDistributor } from "@/lib/pricing";

const prisma = new PrismaClient();

async function check() {
  const productId = "cmk7o2bxy000mxe5rxbr6yyn8";
  const distributor = await prisma.distributor.findFirst({
    where: {
      OR: [
        { name: { contains: "samsung", mode: "insensitive" } },
        { emailDomain: "samsung.com" }
      ]
    }
  });

  console.log(
    "Distributor:",
    distributor ? { id: distributor.id, name: distributor.name } : null
  );

  if (!distributor) {
    console.log("No distributor found for 'samsung'");
    await prisma.$disconnect();
    return;
  }

  const price = await getProductPriceForDistributor(
    productId,
    distributor.id,
    1
  );

  console.log(
    `Computed price for product ${productId} for distributor ${distributor.name}:`,
    price
  );

  // Check whether a DistributorPrice exists for this product/distributor
  const dp = await prisma.distributorPrice.findUnique({
    where: {
      productId_distributorId: { productId, distributorId: distributor.id }
    }
  });
  console.log("DistributorPrice record:", dp);

  // Check category discount
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { category: true, price: true }
  });
  console.log("Product:", product);
  const cat = await prisma.categoryDiscount.findFirst({
    where: {
      distributorId: distributor.id,
      category: { equals: product?.category || "", mode: "insensitive" }
    }
  });
  console.log("CategoryDiscount:", cat);

  await prisma.$disconnect();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
