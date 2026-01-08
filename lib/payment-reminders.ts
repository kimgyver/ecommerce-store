// Payment reminder scheduling logic
import { prisma } from "./prisma";
import { sendPaymentReminder } from "./email";

export type ReminderType =
  | "7_days_before"
  | "1_day_before"
  | "due_date"
  | "overdue_1"
  | "overdue_7";

interface ReminderCheck {
  type: ReminderType;
  daysOffset: number; // Positive = before due date, Negative = after due date
}

// Define when reminders should be sent
const REMINDER_SCHEDULE: ReminderCheck[] = [
  { type: "7_days_before", daysOffset: 7 },
  { type: "1_day_before", daysOffset: 1 },
  { type: "due_date", daysOffset: 0 },
  { type: "overdue_1", daysOffset: -1 },
  { type: "overdue_7", daysOffset: -7 }
];

export async function processPaymentReminders() {
  console.log("[Payment Reminders] Starting reminder check...");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Reset time to midnight UTC for accurate day comparison

  let totalSent = 0;
  let totalProcessed = 0;

  try {
    // Get all pending_payment orders with PO numbers
    const orders = await prisma.order.findMany({
      where: {
        status: "pending_payment",
        poNumber: { not: null },
        paymentDueDate: { not: null },
        paymentMethod: "po"
      },
      include: {
        user: {
          include: {
            distributor: true
          }
        }
      }
    });

    console.log(
      `[Payment Reminders] Found ${orders.length} PO orders to check`
    );

    for (const order of orders) {
      totalProcessed++;

      if (!order.paymentDueDate || !order.poNumber) {
        console.log(
          `[Payment Reminders] Skipping order ${order.id} - missing payment date or PO number`
        );
        continue;
      }

      const dueDate = new Date(order.paymentDueDate);
      dueDate.setUTCHours(0, 0, 0, 0);

      const daysUntilDue = Math.floor(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log(
        `[Payment Reminders] Order ${
          order.poNumber
        }: daysUntilDue=${daysUntilDue}, dueDate=${dueDate.toISOString()}, today=${today.toISOString()}`
      );

      // Check each reminder type
      for (const reminder of REMINDER_SCHEDULE) {
        // Check if this reminder should be sent today
        if (daysUntilDue === reminder.daysOffset) {
          // Check if we've already sent this type of reminder
          const remindersSent = order.paymentRemindersSent || [];
          const alreadySent = remindersSent.includes(reminder.type);

          if (alreadySent) {
            console.log(
              `[Payment Reminders] Already sent ${reminder.type} for order ${order.id}`
            );
            continue;
          }

          // Send the reminder
          console.log(
            `[Payment Reminders] Sending ${reminder.type} for order ${order.id} (${order.poNumber})`
          );

          const result = await sendPaymentReminder({
            orderId: order.id,
            poNumber: order.poNumber,
            customerName: order.user.name || "Customer",
            customerEmail: order.user.email,
            totalAmount: order.totalPrice,
            paymentDueDate: order.paymentDueDate,
            orderDate: order.createdAt,
            reminderType: reminder.type,
            daysUntilDue,
            distributorName: order.user.distributor?.name
          });

          if (result.success) {
            // Update the order to mark this reminder as sent
            await prisma.order.update({
              where: { id: order.id },
              data: {
                paymentRemindersSent: {
                  push: reminder.type
                }
              }
            });

            totalSent++;
            console.log(
              `[Payment Reminders] ✓ Sent ${reminder.type} for ${order.poNumber}`
            );
          } else {
            console.error(
              `[Payment Reminders] ✗ Failed to send ${reminder.type} for ${order.poNumber}`,
              result.error
            );
          }
        }
      }
    }

    console.log(
      `[Payment Reminders] Completed: Processed ${totalProcessed} orders, sent ${totalSent} reminders`
    );

    return {
      success: true,
      totalProcessed,
      totalSent
    };
  } catch (error) {
    console.error("[Payment Reminders] Error processing reminders:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      totalProcessed,
      totalSent
    };
  }
}

// Helper function to get orders that need attention
export async function getOverdueOrders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await prisma.order.findMany({
    where: {
      status: "pending_payment",
      paymentDueDate: { lt: today },
      paymentMethod: "po"
    },
    include: {
      user: {
        include: {
          distributor: true
        }
      }
    },
    orderBy: {
      paymentDueDate: "asc"
    }
  });
}

// Helper function to get upcoming payments (next 7 days)
export async function getUpcomingPayments() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  return await prisma.order.findMany({
    where: {
      status: "pending_payment",
      paymentDueDate: {
        gte: today,
        lte: sevenDaysFromNow
      },
      paymentMethod: "po"
    },
    include: {
      user: {
        include: {
          distributor: true
        }
      }
    },
    orderBy: {
      paymentDueDate: "asc"
    }
  });
}
