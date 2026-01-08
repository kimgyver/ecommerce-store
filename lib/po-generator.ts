// lib/po-generator.ts
import { prisma } from "./prisma";

/**
 * Generate a unique PO number in format: PO-YYYY-NNNN
 * Example: PO-2026-0001, PO-2026-0002, etc.
 */
export async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  // Find the last PO number for this year
  const lastOrder = await prisma.order.findFirst({
    where: {
      poNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      poNumber: true
    }
  });

  let nextNumber = 1;
  if (lastOrder?.poNumber) {
    // Extract number from PO-2026-0001 format
    const lastNumber = parseInt(lastOrder.poNumber.split("-")[2]);
    nextNumber = lastNumber + 1;
  }

  // Format: PO-2026-0001
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

/**
 * Generate a unique Invoice number in format: INV-YYYY-NNNN
 * Example: INV-2026-0001, INV-2026-0002, etc.
 */
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Find the last invoice number for this year
  const lastOrder = await prisma.order.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      invoiceNumber: true
    }
  });

  let nextNumber = 1;
  if (lastOrder?.invoiceNumber) {
    // Extract number from INV-2026-0001 format
    const lastNumber = parseInt(lastOrder.invoiceNumber.split("-")[2]);
    nextNumber = lastNumber + 1;
  }

  // Format: INV-2026-0001
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

/**
 * Calculate payment due date based on payment terms
 * @param terms - Number of days (e.g., 30 for Net 30, 60 for Net 60)
 * @returns Date object for payment due date
 */
export function calculatePaymentDueDate(terms: number = 30): Date {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + terms);
  return dueDate;
}
