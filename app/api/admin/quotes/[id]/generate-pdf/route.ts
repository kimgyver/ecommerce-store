import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { QuoteRequest, Product, User } from "@prisma/client";
import { Buffer } from "buffer";
import path from "path";
import fs from "fs/promises";
import { generateQuotePDF } from "@/lib/quote-pdf-generator";
import { sendQuoteEmail } from "@/lib/quote-email";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const session = await getServerSession({ req, ...authOptions });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quoteId = params?.id;
  if (!quoteId) {
    return NextResponse.json(
      { error: "Missing quote id in request." },
      { status: 400 }
    );
  }
  const quote = (await prisma.quoteRequest.findUnique({
    where: { id: quoteId },
    include: {
      product: true,
      requester: true
    }
  })) as QuoteRequest & { product: Product; requester: User };
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  // 1. Generate PDF (in-memory) using jsPDF
  // Restore all items for the quote (if available)
  // If your quote model supports multiple products/items, fetch them here. For now, fallback to single product logic:
  const items = [
    {
      quantity: quote.quantity ?? 1,
      product: {
        name: quote.product.name,
        sku: quote.product.sku,
        price:
          typeof quote.price === "number" ? quote.price : quote.product.price
      }
    }
  ];
  // If you have a quote.items array, replace the above with:
  // const items = quote.items.map(item => ({
  //   quantity: item.quantity,
  //   product: {
  //     name: item.product.name,
  //     sku: item.product.sku,
  //     price: item.product.price
  //   }
  // }));
  const pdfArrayBuffer = await generateQuotePDF({
    items,
    productName: quote.product.name,
    productSku: quote.product.sku,
    requesterEmail: quote.requester.email,
    requesterName: quote.requester.name || undefined,
    status: quote.status,
    createdAt: quote.createdAt,
    price: typeof quote.price === "number" ? quote.price : quote.product.price,
    notes: quote.notes || undefined
  });
  const pdfBuffer = Buffer.from(pdfArrayBuffer);

  // Save generated PDF to public/uploads/quotes and set quoteFileUrl
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "quotes");
    await fs.mkdir(uploadDir, { recursive: true });
    const fileName = `quote-${quoteId}-${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, pdfBuffer);
    const fileUrl = `/uploads/quotes/${fileName}`;
    await prisma.quoteRequest.update({
      where: { id: quoteId },
      data: { quoteFileUrl: fileUrl, quoteSentAt: new Date() }
    });
  } catch (e) {
    console.error("Failed to save generated PDF:", e);
    // continue - email can still be sent with buffer
  }

  // 4. Send email with helper
  const emailResult = await sendQuoteEmail({ quote, pdfBuffer });

  // 5. Return updated quote and email result
  const updated = await prisma.quoteRequest.findUnique({
    where: { id: quoteId },
    include: { product: true, requester: true }
  });
  return NextResponse.json({ ...updated, emailResult });
}
