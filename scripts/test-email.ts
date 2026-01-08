import { sendPOEmail } from "../lib/email";

async function testEmail() {
  console.log("Testing email send...");

  const result = await sendPOEmail({
    orderId: "test-order-123",
    poNumber: "PO-2026-TEST",
    customerName: "Test Customer",
    customerEmail: "kim@samsung.com",
    totalAmount: 999.99,
    paymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    orderDate: new Date(),
    items: [
      {
        productName: "Test Product",
        quantity: 2,
        price: 499.995
      }
    ],
    shippingAddress: {
      recipientName: "John Doe",
      recipientPhone: "123-456-7890",
      postalCode: "12345",
      address1: "123 Test St",
      address2: "Suite 100"
    }
  });

  console.log("Email send result:", result);
}

testEmail().catch(console.error);
