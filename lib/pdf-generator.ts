import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface POData {
  poNumber: string;
  orderId: string;
  orderDate: Date;
  paymentDueDate: Date;
  customerName: string;
  customerEmail: string;
  distributorName?: string;
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
  totalAmount: number;
}

export function generatePOPDF(data: POData): jsPDF {
  const doc = new jsPDF();

  // Company Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PURCHASE ORDER", 105, 20, { align: "center" });

  // PO Number (prominent)
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235); // Blue color
  doc.text(data.poNumber, 105, 30, { align: "center" });

  // Reset color
  doc.setTextColor(0, 0, 0);

  // Company Info (left side)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("From:", 20, 45);
  doc.setFont("helvetica", "normal");
  doc.text("E-Commerce Store", 20, 52);
  doc.text("123 Business Street", 20, 57);
  doc.text("Business City, BC 12345", 20, 62);
  doc.text("support@ecommerce-store.com", 20, 67);

  // Customer Info (right side)
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 120, 45);
  doc.setFont("helvetica", "normal");
  doc.text(data.customerName, 120, 52);
  if (data.distributorName) {
    doc.text(data.distributorName, 120, 57);
    doc.text(data.customerEmail, 120, 62);
  } else {
    doc.text(data.customerEmail, 120, 57);
  }

  // Ship To
  doc.setFont("helvetica", "bold");
  doc.text("Ship To:", 120, 75);
  doc.setFont("helvetica", "normal");
  doc.text(data.shippingAddress.recipientName, 120, 82);
  doc.text(data.shippingAddress.recipientPhone, 120, 87);
  doc.text(data.shippingAddress.address1, 120, 92);
  if (data.shippingAddress.address2) {
    doc.text(data.shippingAddress.address2, 120, 97);
    doc.text(data.shippingAddress.postalCode, 120, 102);
  } else {
    doc.text(data.shippingAddress.postalCode, 120, 97);
  }

  // Order Details
  const startY = 80;
  doc.setFont("helvetica", "bold");
  doc.text("Order Details:", 20, startY);
  doc.setFont("helvetica", "normal");
  doc.text(`Order ID: ${data.orderId}`, 20, startY + 7);
  doc.text(
    `Order Date: ${new Date(data.orderDate).toLocaleDateString()}`,
    20,
    startY + 14
  );
  doc.text(
    `Payment Due: ${new Date(data.paymentDueDate).toLocaleDateString()}`,
    20,
    startY + 21
  );
  doc.text("Payment Terms: Net 30", 20, startY + 28);

  // Items Table
  const tableStartY = startY + 40;

  const tableData = data.items.map(item => [
    item.productName,
    item.sku || "N/A",
    item.quantity.toString(),
    `$${item.price.toFixed(2)}`,
    `$${(item.quantity * item.price).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [["Product", "SKU", "Qty", "Unit Price", "Total"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [37, 99, 235], // Blue
      textColor: 255,
      fontStyle: "bold"
    },
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 35, halign: "right" }
    }
  });

  // Total
  // Type-safe access to lastAutoTable (jsPDF with autoTable augments the instance)
  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY || tableStartY + 50;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Total Amount:", 130, finalY + 15);
  doc.setTextColor(37, 99, 235);
  doc.text(`$${data.totalAmount.toFixed(2)}`, 185, finalY + 15, {
    align: "right"
  });

  // Reset color
  doc.setTextColor(0, 0, 0);

  // Payment Instructions
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Instructions:", 20, finalY + 30);
  doc.setFont("helvetica", "normal");
  doc.text("Please reference PO Number when making payment.", 20, finalY + 37);
  doc.text("Payment is due within 30 days of order date.", 20, finalY + 44);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    "This is a computer-generated document. No signature required.",
    105,
    280,
    { align: "center" }
  );
  doc.text("Thank you for your business!", 105, 285, { align: "center" });

  return doc;
}

export function downloadPOPDF(data: POData, filename?: string) {
  const doc = generatePOPDF(data);
  const pdfFilename = filename || `PO_${data.poNumber}.pdf`;
  doc.save(pdfFilename);
}

export function getPOPDFBuffer(data: POData): Buffer {
  const doc = generatePOPDF(data);
  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}
