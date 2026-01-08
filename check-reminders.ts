import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const orders = await prisma.order.findMany({
    where: {
      status: "pending_payment",
      paymentMethod: "po",
      poNumber: { not: null }
    },
    select: {
      poNumber: true,
      paymentDueDate: true,
      paymentRemindersSent: true
    }
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  console.log("Today (UTC):", today.toISOString());
  console.log("\nPending PO Orders:");
  orders.forEach(o => {
    const due = new Date(o.paymentDueDate!);
    due.setUTCHours(0, 0, 0, 0);
    const days = Math.floor(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(
      `  ${o.poNumber}: due=${
        due.toISOString().split("T")[0]
      }, daysUntilDue=${days}, reminders=${JSON.stringify(
        o.paymentRemindersSent
      )}`
    );
  });

  await prisma.$disconnect();
}

check();
