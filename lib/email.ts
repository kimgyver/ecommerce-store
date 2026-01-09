import { Resend } from "resend";
import { getPOPDFBuffer } from "./pdf-generator";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface POEmailData {
  orderId: string;
  poNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  paymentDueDate: Date;
  orderDate: Date;
  items: Array<{
    productName: string;
    sku?: string;
    quantity: number;
    price: number;
    basePrice?: number;
  }>;
  shippingAddress: {
    recipientName: string;
    recipientPhone: string;
    postalCode: string;
    address1: string;
    address2?: string;
  };
  distributorName?: string;
}

export async function sendPOEmail(data: POEmailData) {
  try {
    // In development, send to admin email instead of customer email
    const isDevelopment = process.env.NODE_ENV === "development";
    const recipientEmail = isDevelopment
      ? process.env.ADMIN_EMAIL || data.customerEmail
      : data.customerEmail;

    console.log("[Email] Sending PO email:", {
      environment: process.env.NODE_ENV,
      originalEmail: data.customerEmail,
      actualRecipient: recipientEmail,
      isDevelopment
    });

    // Generate PDF attachment
    const pdfBuffer = getPOPDFBuffer({
      poNumber: data.poNumber,
      orderId: data.orderId,
      orderDate: data.orderDate,
      paymentDueDate: data.paymentDueDate,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      distributorName: data.distributorName,
      items: data.items,
      shippingAddress: data.shippingAddress,
      totalAmount: data.totalAmount
    });

    const response = await resend.emails.send({
      from: "E-Commerce Store <onboarding@resend.dev>", // Resend test email (works without domain verification)
      to: recipientEmail,
      subject: `Purchase Order Created: ${data.poNumber}`,
      html: generatePOEmailHTML(data),
      attachments: [
        {
          filename: `${data.poNumber}.pdf`,
          content: pdfBuffer
        }
      ]
    });

    console.log("[Email] Resend API response:", response);

    console.log("[Email] PO email sent successfully:", {
      orderId: data.orderId,
      poNumber: data.poNumber,
      email: data.customerEmail,
      sentTo: recipientEmail,
      resendId: response.data?.id,
      pdfAttached: true
    });

    return { success: true, id: response.data?.id };
  } catch (error) {
    console.error("[Email] Failed to send PO email:", error);
    console.error("[Email] Error details:", JSON.stringify(error, null, 2));
    // Don't throw - we don't want email failures to block order creation
    return { success: false, error };
  }
}

function generatePOEmailHTML(data: POEmailData): string {
  const formattedDueDate = new Date(data.paymentDueDate).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  );

  const itemsHTML = data.items
    .map(
      item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${
        item.productName
      }</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${
        item.quantity
      }</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(
        2
      )}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(
        item.quantity * item.price
      ).toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Purchase Order Created</h1>
      <p style="margin: 8px 0 0 0; color: #dbeafe; font-size: 16px;">Your order has been received and is being processed</p>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <!-- PO Info -->
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px 0; color: #1e40af; font-size: 20px;">PO Number: ${
          data.poNumber
        }</h2>
        <p style="margin: 4px 0; color: #1e3a8a; font-size: 14px;">Order ID: ${
          data.orderId
        }</p>
        <p style="margin: 4px 0; color: #1e3a8a; font-size: 14px;">Payment Due: <strong>${formattedDueDate}</strong> (Net 30)</p>
      </div>

      <!-- Customer Info -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Customer Information</h3>
        <p style="margin: 4px 0; color: #4b5563;"><strong>Name:</strong> ${
          data.customerName
        }</p>
        <p style="margin: 4px 0; color: #4b5563;"><strong>Email:</strong> ${
          data.customerEmail
        }</p>
      </div>

      <!-- Shipping Address -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Shipping Address</h3>
        <p style="margin: 4px 0; color: #4b5563;"><strong>${
          data.shippingAddress.recipientName
        }</strong></p>
        <p style="margin: 4px 0; color: #4b5563;">${
          data.shippingAddress.recipientPhone
        }</p>
        <p style="margin: 4px 0; color: #4b5563;">${
          data.shippingAddress.address1
        }</p>
        ${
          data.shippingAddress.address2
            ? `<p style="margin: 4px 0; color: #4b5563;">${data.shippingAddress.address2}</p>`
            : ""
        }
        <p style="margin: 4px 0; color: #4b5563;">${
          data.shippingAddress.postalCode
        }</p>
      </div>

      <!-- Order Items -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Product</th>
              <th style="padding: 12px; text-align: center; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Qty</th>
              <th style="padding: 12px; text-align: right; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Price</th>
              <th style="padding: 12px; text-align: right; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
      </div>

      <!-- Total -->
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; text-align: right;">
        <p style="margin: 0; font-size: 20px; color: #1f2937;">
          <strong>Total Amount: <span style="color: #3b82f6;">$${data.totalAmount.toFixed(
            2
          )}</span></strong>
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">Payment terms: Net 30 days</p>
      </div>

      <!-- Next Steps -->
      <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-radius: 8px;">
        <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 16px;">📋 Next Steps</h3>
        <ul style="margin: 8px 0; padding-left: 20px; color: #78350f;">
          <li style="margin: 4px 0;">Your order is now being processed</li>
          <li style="margin: 4px 0;">An invoice will be sent separately</li>
          <li style="margin: 4px 0;">Payment is due by <strong>${formattedDueDate}</strong></li>
          <li style="margin: 4px 0;">You will receive a shipping notification when your order ships</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Thank you for your business!</p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        If you have any questions, please contact our support team.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Payment Reminder Email Interface
export interface PaymentReminderData {
  orderId: string;
  poNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  paymentDueDate: Date;
  orderDate: Date;
  reminderType:
    | "7_days_before"
    | "1_day_before"
    | "due_date"
    | "overdue_1"
    | "overdue_7";
  daysUntilDue?: number; // Positive for before, 0 for due, negative for overdue
  distributorName?: string;
}

export async function sendPaymentReminder(data: PaymentReminderData) {
  try {
    // In development, send to admin email
    const isDevelopment = process.env.NODE_ENV === "development";
    const recipientEmail = isDevelopment
      ? process.env.ADMIN_EMAIL || data.customerEmail
      : data.customerEmail;

    console.log("[Email] Sending payment reminder:", {
      reminderType: data.reminderType,
      poNumber: data.poNumber,
      originalEmail: data.customerEmail,
      actualRecipient: recipientEmail,
      daysUntilDue: data.daysUntilDue
    });

    // Determine subject and urgency based on reminder type
    let subject = "";
    let urgencyColor = "#3b82f6"; // blue
    let urgencyText = "";

    switch (data.reminderType) {
      case "7_days_before":
        subject = `Payment Reminder: ${data.poNumber} - Due in 7 Days`;
        urgencyColor = "#3b82f6";
        urgencyText = "Payment Due in 7 Days";
        break;
      case "1_day_before":
        subject = `Payment Reminder: ${data.poNumber} - Due Tomorrow`;
        urgencyColor = "#f59e0b";
        urgencyText = "Payment Due Tomorrow";
        break;
      case "due_date":
        subject = `Payment Due Today: ${data.poNumber}`;
        urgencyColor = "#f59e0b";
        urgencyText = "Payment Due Today";
        break;
      case "overdue_1":
        subject = `OVERDUE: Payment Required for ${data.poNumber}`;
        urgencyColor = "#ef4444";
        urgencyText = "Payment Overdue - Immediate Action Required";
        break;
      case "overdue_7":
        subject = `URGENT: Overdue Payment ${data.poNumber}`;
        urgencyColor = "#dc2626";
        urgencyText = "Seriously Overdue - Please Contact Us";
        break;
    }

    const formattedDueDate = data.paymentDueDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const formattedOrderDate = data.orderDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const htmlContent = generatePaymentReminderHTML({
      ...data,
      formattedDueDate,
      formattedOrderDate,
      urgencyColor,
      urgencyText
    });

    const response = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: recipientEmail,
      subject,
      html: htmlContent
    });

    console.log("[Email] Payment reminder sent successfully:", {
      messageId: response.data?.id,
      reminderType: data.reminderType,
      poNumber: data.poNumber
    });

    return { success: true, messageId: response.data?.id };
  } catch (error) {
    console.error("[Email] Failed to send payment reminder:", error);
    return { success: false, error };
  }
}

function generatePaymentReminderHTML(data: {
  poNumber: string;
  customerName: string;
  totalAmount: number;
  formattedDueDate: string;
  formattedOrderDate: string;
  urgencyColor: string;
  urgencyText: string;
  daysUntilDue?: number;
  distributorName?: string;
}) {
  const isOverdue = (data.daysUntilDue ?? 0) < 0;
  const daysOverdue = Math.abs(data.daysUntilDue ?? 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Payment Reminder</h1>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px;">
      <!-- Urgency Banner -->
      <div style="background-color: ${
        data.urgencyColor
      }; color: white; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
        <h2 style="margin: 0; font-size: 20px;">⚠️ ${data.urgencyText}</h2>
      </div>

      <!-- Greeting -->
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #1f2937;">Hello ${
        data.customerName
      },</p>
      
      ${
        isOverdue
          ? `<p style="margin: 0 0 16px 0; font-size: 16px; color: #1f2937;">
             This is a reminder that your payment for <strong>PO ${
               data.poNumber
             }</strong> is now 
             <strong style="color: #ef4444;">${daysOverdue} day${
              daysOverdue > 1 ? "s" : ""
            } overdue</strong>.
           </p>`
          : `<p style="margin: 0 0 16px 0; font-size: 16px; color: #1f2937;">
             This is a friendly reminder about your upcoming payment for <strong>PO ${data.poNumber}</strong>.
           </p>`
      }

      <!-- Order Details -->
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid ${
        data.urgencyColor
      };">
        <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">PO Number:</td>
            <td style="padding: 8px 0; color: #1f2937; font-weight: bold; text-align: right;">${
              data.poNumber
            }</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Order Date:</td>
            <td style="padding: 8px 0; color: #1f2937; text-align: right;">${
              data.formattedOrderDate
            }</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount Due:</td>
            <td style="padding: 8px 0; color: #1f2937; font-weight: bold; font-size: 18px; text-align: right;">$${data.totalAmount.toFixed(
              2
            )}</td>
          </tr>
          <tr style="border-top: 2px solid ${data.urgencyColor};">
            <td style="padding: 12px 0 0 0; color: #6b7280; font-size: 14px;">Payment Due Date:</td>
            <td style="padding: 12px 0 0 0; color: ${
              data.urgencyColor
            }; font-weight: bold; font-size: 16px; text-align: right;">${
    data.formattedDueDate
  }</td>
          </tr>
        </table>
      </div>

      <!-- Action Required -->
      <div style="background-color: ${
        isOverdue ? "#fee2e2" : "#fef3c7"
      }; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; color: ${
          isOverdue ? "#991b1b" : "#92400e"
        }; font-size: 16px;">
          ${
            isOverdue
              ? "🚨 Immediate Action Required"
              : "📋 What You Need to Do"
          }
        </h3>
        <ul style="margin: 8px 0; padding-left: 20px; color: ${
          isOverdue ? "#7f1d1d" : "#78350f"
        };">
          ${
            isOverdue
              ? `<li style="margin: 6px 0;"><strong>Your payment is ${daysOverdue} day${
                  daysOverdue > 1 ? "s" : ""
                } overdue</strong></li>
               <li style="margin: 6px 0;">Please submit payment immediately to avoid account suspension</li>
               <li style="margin: 6px 0;">Contact us if you need to discuss payment arrangements</li>`
              : `<li style="margin: 6px 0;">Process payment for <strong>$${data.totalAmount.toFixed(
                  2
                )}</strong></li>
               <li style="margin: 6px 0;">Payment due by <strong>${
                 data.formattedDueDate
               }</strong></li>
               <li style="margin: 6px 0;">Use PO number <strong>${
                 data.poNumber
               }</strong> as reference</li>`
          }
        </ul>
      </div>

      <!-- Payment Methods -->
      <div style="margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">💳 Payment Methods</h3>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
          • Bank Transfer: [Bank Account Details]<br>
          • Check: [Mailing Address]<br>
          • Online Payment: [Payment Portal URL]
        </p>
        <p style="margin: 12px 0 0 0; font-size: 14px; color: #6b7280;">
          <em>Please include PO number ${
            data.poNumber
          } as payment reference</em>
        </p>
      </div>

      ${
        isOverdue
          ? `<div style="background-color: #fef2f2; border: 2px solid #ef4444; padding: 16px; border-radius: 8px; margin: 24px 0;">
             <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: bold;">
               ⚠️ Late Payment Notice: Continued non-payment may result in account suspension and additional fees.
             </p>
           </div>`
          : ""
      }

      <!-- Contact -->
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
        If you have already submitted payment, please disregard this reminder. If you have any questions or need assistance, 
        please contact our accounts team.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
        ${
          data.distributorName ? `${data.distributorName} - ` : ""
        }Accounts Receivable
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        This is an automated reminder. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Quote request email type and function
export interface QuoteRequestEmailData {
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  location?: string;
  poNumber?: string;
  email: string;
}

export async function sendQuoteRequestEmail(data: QuoteRequestEmailData) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    const toEmail = isDevelopment
      ? process.env.ADMIN_EMAIL || data.email
      : data.email;
    const fromEmail =
      process.env.EMAIL_FROM || "E-Commerce Store <onboarding@resend.dev>";
    const subject = `[Quote Request] ${data.productName} x ${data.quantity}`;
    const html = `
      <h2>New Quote Request</h2>
      <ul>
        <li><b>Product:</b> ${data.productName}${
      data.productSku ? ` (SKU: ${data.productSku})` : ""
    }</li>
        <li><b>Quantity:</b> ${data.quantity}</li>
        ${data.location ? `<li><b>Location:</b> ${data.location}</li>` : ""}
        ${data.poNumber ? `<li><b>PO Number:</b> ${data.poNumber}</li>` : ""}
        <li><b>Requester Email:</b> ${data.email}</li>
      </ul>
      <p>This quote request was submitted quickly from the field. It is delivered by email only and not stored in the database.</p>
    `;
    const response = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject,
      html
    });
    return { success: true, id: response.data?.id };
  } catch (error) {
    console.error("[Email] Failed to send Quote request email:", error);
    return { success: false, error };
  }
}
