import { NextRequest, NextResponse } from "next/server";
import { sendQuoteRequestEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[QuoteRequest] Incoming body:", body);
    const {
      productId,
      productName,
      quantity,
      location,
      poNumber,
      email,
      productSku
    } = body;
    const qty = Number(quantity);
    if (!productId || !productName || !email || isNaN(qty) || qty < 1) {
      console.error("[QuoteRequest] Missing required fields", {
        productId,
        productName,
        quantity: qty,
        email
      });
      return NextResponse.json(
        { error: "Required fields are missing." },
        { status: 400 }
      );
    }

    // Get user session for requesterId (if logged in)
    let requesterId: string | null = null;
    let distributorId: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        requesterId = session.user.id;
        distributorId = session.user.distributorId || null;
      }
    } catch (e) {
      console.error("[QuoteRequest] Session error:", e);
    }

    // Store quote request in DB
    let quoteRequest;
    try {
      // Build notes including location, PO number, and provided email so
      // that anonymous submissions preserve these fields in the DB and PDF.
      const notesParts: string[] = [];
      if (location) notesParts.push(`Location: ${location}`);
      if (poNumber) notesParts.push(`PO: ${poNumber}`);
      if (email) notesParts.push(`Email: ${email}`);

      const createData: Record<string, unknown> = {
        product: { connect: { id: productId } },
        status: "requested",
        quantity: qty,
        notes: notesParts.length ? notesParts.join("\n") : undefined,
        history: [
          {
            status: "requested",
            changedBy: requesterId,
            timestamp: new Date().toISOString(),
            note: "Quote requested via API"
          }
        ]
      };
      if (requesterId)
        createData["requester"] = { connect: { id: requesterId } };
      if (distributorId)
        createData["distributor"] = { connect: { id: distributorId } };

      quoteRequest = await prisma.quoteRequest.create({
        // cast after conditional attachments so TS doesn't require requester at literal creation
        data: createData as unknown as Prisma.QuoteRequestCreateInput
      });
      console.log("[QuoteRequest] Created in DB:", quoteRequest);
    } catch (dbError) {
      console.error("[QuoteRequest] DB error:", dbError);
      return NextResponse.json(
        { error: "DB error", details: String(dbError) },
        { status: 500 }
      );
    }

    // Send email as before
    let result;
    try {
      result = await sendQuoteRequestEmail({
        productId,
        productName,
        quantity: qty,
        location,
        poNumber,
        email,
        productSku
      });
      console.log("[QuoteRequest] Email result:", result);
    } catch (emailError) {
      console.error("[QuoteRequest] Email error:", emailError);
      return NextResponse.json(
        {
          error: "Email error",
          details: String(emailError),
          id: quoteRequest.id
        },
        { status: 500 }
      );
    }

    if (result.success) {
      return NextResponse.json({ success: true, id: quoteRequest.id });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send email.", id: quoteRequest.id },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[QuoteRequest] Server error:", error);
    return NextResponse.json(
      { error: "Server error.", details: String(error) },
      { status: 500 }
    );
  }
}
