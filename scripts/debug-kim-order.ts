// scripts/debug-kim-order.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugKimOrder() {
  console.log("=== Debugging Kim's Order ===\n");

  // 1. Check Kim's current user status
  const kim = await prisma.user.findUnique({
    where: { email: "kim@samsung.com" },
    include: {
      distributor: true
    }
  });

  console.log("1. Kim's Current User Status:");
  console.log({
    email: kim?.email,
    role: kim?.role,
    distributorId: kim?.distributorId,
    distributorName: kim?.distributor?.name
  });
  console.log();

  // 2. Check the specific order
  const order = await prisma.order.findUnique({
    where: { id: "cmk4mzmqc000kxermediij6da" },
    include: {
      user: {
        include: {
          distributor: true
        }
      }
    }
  });

  console.log("2. Order Details:");
  console.log({
    orderId: order?.id,
    orderCreatedAt: order?.createdAt,
    poNumber: order?.poNumber,
    paymentDueDate: order?.paymentDueDate,
    paymentMethod: order?.paymentMethod,
    userEmail: order?.user.email,
    userRole: order?.user.role,
    userDistributorId: order?.user.distributorId,
    userDistributorName: order?.user.distributor?.name
  });
  console.log();

  // 3. Check when Samsung distributor was created
  const samsung = await prisma.distributor.findFirst({
    where: { emailDomain: "samsung.com" }
  });

  console.log("3. Samsung Distributor:");
  console.log({
    id: samsung?.id,
    name: samsung?.name,
    createdAt: samsung?.createdAt
  });
  console.log();

  // 4. Timeline comparison
  if (order && samsung) {
    console.log("4. Timeline Analysis:");
    console.log(`Order created: ${order.createdAt}`);
    console.log(`Samsung distributor created: ${samsung.createdAt}`);

    if (order.createdAt < samsung.createdAt) {
      console.log("❌ Order was created BEFORE Samsung distributor existed");
      console.log("   -> This is why PO was not generated");
    } else {
      console.log("✅ Order was created AFTER Samsung distributor existed");
      console.log(
        "   -> PO should have been generated - investigating further..."
      );

      // Check what the user's role/distributorId was at order creation time
      console.log("\n5. At order creation time, user had:");
      console.log(`   - role: ${order.user.role}`);
      console.log(`   - distributorId: ${order.user.distributorId}`);

      if (!order.user.distributorId) {
        console.log(
          "   ❌ distributorId was NULL -> Auto-sync happened AFTER order"
        );
      } else if (order.user.role !== "distributor") {
        console.log("   ❌ role was not 'distributor' -> Role update issue");
      }
    }
  }

  await prisma.$disconnect();
}

debugKimOrder().catch(console.error);
