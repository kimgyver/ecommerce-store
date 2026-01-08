// scripts/debug-po.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugPO() {
  console.log("🔍 Debugging PO Generation Issue...\n");

  // 1. Check Mike's user info
  const mike = await prisma.user.findUnique({
    where: { email: "mike@chromet.com" },
    select: {
      id: true,
      email: true,
      role: true,
      distributorId: true,
      distributor: {
        select: {
          id: true,
          name: true,
          emailDomain: true
        }
      }
    }
  });

  console.log("👤 Mike's User Info:");
  console.log(JSON.stringify(mike, null, 2));
  console.log("");

  // 2. Check recent orders
  const orders = await prisma.order.findMany({
    where: {
      user: {
        email: "mike@chromet.com"
      }
    },
    select: {
      id: true,
      poNumber: true,
      paymentDueDate: true,
      paymentMethod: true,
      totalPrice: true,
      createdAt: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 3
  });

  console.log("📦 Recent Orders:");
  console.log(JSON.stringify(orders, null, 2));
  console.log("");

  // 3. Test PO generation logic
  const isDistributor = mike?.role === "distributor" && mike?.distributorId;
  console.log(`🔍 PO Generation Check:`);
  console.log(`   Role: ${mike?.role}`);
  console.log(`   DistributorId: ${mike?.distributorId}`);
  console.log(`   Is Distributor: ${isDistributor}`);
  console.log(`   Should Generate PO: ${isDistributor ? "YES ✅" : "NO ❌"}`);

  await prisma.$disconnect();
}

debugPO().catch(console.error);
