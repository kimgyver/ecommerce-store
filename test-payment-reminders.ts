// Test script for payment reminder system
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testPaymentReminders() {
  console.log("=== Testing Payment Reminder System ===\n");

  try {
    // Find a PO order to test with
    const testOrder = await prisma.order.findFirst({
      where: {
        paymentMethod: "po",
        poNumber: { not: null },
        status: "pending_payment"
      },
      include: {
        user: true
      }
    });

    if (!testOrder) {
      console.log("❌ No PO orders found for testing");
      console.log("Create a PO order first using the checkout flow\n");
      return;
    }

    console.log("✓ Found test order:", {
      id: testOrder.id,
      poNumber: testOrder.poNumber,
      customer: testOrder.user.email,
      totalAmount: testOrder.totalPrice,
      currentDueDate: testOrder.paymentDueDate,
      currentReminders: testOrder.paymentRemindersSent
    });

    // Set due date to tomorrow to trigger "1_day_before" reminder
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    console.log(
      "\n📅 Setting payment due date to tomorrow:",
      tomorrow.toLocaleDateString()
    );
    console.log("🔄 Resetting reminder history...\n");

    await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        paymentDueDate: tomorrow,
        paymentRemindersSent: [] // Reset to allow new reminders
      }
    });

    console.log("✓ Order updated successfully");
    console.log("\n🚀 Now run the cron endpoint to test:");
    console.log("   curl http://localhost:3000/api/cron/payment-reminders");
    console.log("\n📧 Check email: jinyoung777@gmail.com (development mode)");
    console.log("\n💡 Expected reminder type: 1_day_before");
    console.log(
      "💡 Email subject: Payment Reminder: " +
        testOrder.poNumber +
        " - Due Tomorrow"
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testPaymentReminders();
