import { Resend } from "resend";
import type { QuoteRequest, Product, User } from "@prisma/client";

export interface QuoteEmailData {
  quote: QuoteRequest & { product: Product; requester: User };
  pdfBuffer: Buffer;
}

export interface QuoteEmailResult {
  success: boolean;
  id?: string;
  sentTo?: string;
  error?: string;
}

export async function sendQuoteEmail({
  quote,
  pdfBuffer
}: QuoteEmailData): Promise<QuoteEmailResult> {
  let result: QuoteEmailResult = { success: false };
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    const recipientEmail = isDevelopment
      ? process.env.ADMIN_EMAIL || quote.requester.email
      : quote.requester.email;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const htmlParts = [];
    htmlParts.push(
      `<p>Please find attached your quote (ID: <b>${
        quote.id
      }</b>, Quantity: <b>${quote.quantity ?? 1}</b>).</p>`
    );
    if (quote.quoteFileUrl) {
      htmlParts.push(
        `<p>You can also download the quote directly: <a href="${quote.quoteFileUrl}">Download Quote PDF</a></p>`
      );
    }
    htmlParts.push(`<p>Thank you for your request.</p>`);

    const response = await resend.emails.send({
      from:
        process.env.EMAIL_FROM || "E-Commerce Store <onboarding@resend.dev>",
      to: recipientEmail,
      subject: `Your Quote from Our Store`,
      text: `Please find attached your quote (ID: ${quote.id}, Quantity: ${
        quote.quantity ?? 1
      }).${quote.quoteFileUrl ? ` Download: ${quote.quoteFileUrl}` : ""}`,
      html: htmlParts.join("\n"),
      attachments: [
        {
          filename: `quote-${quote.id}.pdf`,
          content: pdfBuffer
        }
      ]
    });
    console.log("[Email] Resend API response (quote PDF):", response);
    result = {
      success: true,
      id: response.data?.id,
      sentTo: recipientEmail
    };
  } catch (e) {
    console.error("[Email] Failed to send quote PDF via Resend:", e);
    result = {
      success: false,
      error: e instanceof Error ? e.message : String(e)
    };
  }
  return result;
}
