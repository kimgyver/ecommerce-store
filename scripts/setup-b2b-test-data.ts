// scripts/setup-b2b-test-data.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Setting up B2B test data...\n");

  // 1. Create a distributor account
  console.log("1️⃣ Creating distributor account...");
  const hashedPassword = await bcrypt.hash("distributor123", 10);

  const distributor = await prisma.user.upsert({
    where: { email: "distributor@test.com" },
    update: {},
    create: {
      email: "distributor@test.com",
      name: "Test Distributor",
      password: hashedPassword,
      role: "distributor",
      companyName: "Chromet Inc.",
      phone: "555-0100",
      address: "123 Business St"
    }
  });
  console.log(
    `✅ Distributor created: ${distributor.email} (${distributor.companyName})`
  );
  console.log(`   Login: distributor@test.com / distributor123\n`);

  // 2. Get first 3 products
  console.log("2️⃣ Getting products...");
  const products = await prisma.product.findMany({
    take: 3,
    orderBy: { createdAt: "asc" }
  });

  if (products.length === 0) {
    console.log("❌ No products found. Please add products first.");
    return;
  }

  console.log(`✅ Found ${products.length} products\n`);

  // 3. Set up B2B pricing for each product
  console.log("3️⃣ Setting up B2B pricing...\n");

  for (const product of products) {
    const basePrice = product.price;
    const b2bPrice = basePrice * 0.8; // 20% discount

    // Quantity-based discount tiers
    const discountTiers = [
      { minQty: 1, maxQty: 10, price: basePrice * 0.8 }, // 20% off
      { minQty: 11, maxQty: 50, price: basePrice * 0.75 }, // 25% off
      { minQty: 51, maxQty: null, price: basePrice * 0.7 } // 30% off
    ];

    await prisma.distributorPrice.upsert({
      where: {
        productId_distributorId: {
          productId: product.id,
          distributorId: distributor.id
        }
      },
      update: {
        customPrice: b2bPrice,
        discountTiers: discountTiers as any
      },
      create: {
        productId: product.id,
        distributorId: distributor.id,
        customPrice: b2bPrice,
        discountTiers: discountTiers as any
      }
    });

    console.log(`   ✅ ${product.name} (SKU: ${product.sku})`);
    console.log(`      B2C Price: $${basePrice.toFixed(2)}`);
    console.log(`      B2B Base:  $${b2bPrice.toFixed(2)} (20% off)`);
    console.log(`      Tiers:`);
    console.log(
      `        1-10 units:  $${(basePrice * 0.8).toFixed(2)} (20% off)`
    );
    console.log(
      `        11-50 units: $${(basePrice * 0.75).toFixed(2)} (25% off)`
    );
    console.log(
      `        51+ units:   $${(basePrice * 0.7).toFixed(2)} (30% off)\n`
    );
  }

  console.log("✨ B2B test data setup complete!\n");
  console.log("📋 Test Scenario:");
  console.log(
    "   1. Login as customer (existing account) → See regular prices"
  );
  console.log("   2. Login as distributor@test.com → See B2B prices (20% off)");
  console.log("   3. Add 11+ items to cart → See quantity discounts (25% off)");
  console.log("   4. Add 51+ items to cart → See max discounts (30% off)\n");
}

main()
  .catch(e => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
