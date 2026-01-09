import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// No Prisma types used here; use plain object types for quote and items

// Generates a PDF for a quote, returns Uint8Array (for email attachment or download)

export interface QuotePDFProduct {
  name: string;
  sku: string;
  price: number;
}

export interface QuotePDFItem {
  quantity: number;
  product: QuotePDFProduct;
}

export interface QuotePDFData {
  items: QuotePDFItem[];
  productName: string;
  productSku: string;
  requesterEmail: string;
  requesterName?: string;
  status: string;
  createdAt: Date;
  price?: number;
  notes?: string;
}

export async function generateQuotePDF(quote: QuotePDFData) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text("Quote", 14, 20);

  // Info table (Field/Value)
  const infoRows = [
    ["Product", `${quote.productSku} - ${quote.productName}`],
    ["Quantity", quote.items?.[0]?.quantity ?? "-"],
    [
      "Requester",
      `${quote.requesterEmail}${
        quote.requesterName ? ` (${quote.requesterName})` : ""
      }`
    ],
    ["Status", quote.status],
    ["Created At", quote.createdAt.toLocaleString()],
    ["Price", quote.price !== undefined ? `$${quote.price.toFixed(2)}` : "-"],
    ["Notes", quote.notes || "-"]
  ];
  autoTable(doc, {
    head: [["Field", "Value"]],
    body: infoRows,
    startY: 28,
    styles: { fontSize: 11 },
    headStyles: { fillColor: [44, 62, 80], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 }
  });

  // Product table
  const tableColumn = ["Product (SKU)", "Quantity", "Unit Price", "Total"];
  const tableRows = quote.items.map((item: QuotePDFItem) => [
    `${item.product.name}${
      item.product.sku ? ` (SKU: ${item.product.sku})` : ""
    }`,
    item.quantity,
    item.product.price.toLocaleString(),
    (item.product.price * item.quantity).toLocaleString()
  ]);
  // Get Y after info table
  const infoY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY || 42;
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: infoY + 6,
    styles: { fontSize: 11 },
    headStyles: { fillColor: [44, 62, 80], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 }
  });

  // Total
  const total = quote.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  doc.setFontSize(13);
  const finalY: number =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY || infoY + 42;
  doc.text(`Grand Total: ${total.toLocaleString()}`, 14, finalY + 12);

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("This quote is exclusive of VAT.", 14, finalY + 22);

  // PDF generation timestamp (right-aligned at bottom margin)
  try {
    const nowStr = new Date().toLocaleString();
    // page size helpers may differ between jsPDF versions; avoid `any` by
    // defining a narrow shape for the fields we read and using safe fallbacks.
    type JSPDFPageSize = {
      width?: number;
      height?: number;
      getWidth?: () => number;
      getHeight?: () => number;
    };
    const internal = doc as unknown as {
      internal?: { pageSize?: JSPDFPageSize };
    };
    const pageSize = internal.internal?.pageSize;
    const pageWidth = pageSize?.width ?? pageSize?.getWidth?.() ?? 210; // fallback ~A4 width
    const pageHeight = pageSize?.height ?? pageSize?.getHeight?.() ?? 297; // fallback ~A4 height
    const bottomY = pageHeight - 10;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`PDF generated at: ${nowStr}`, pageWidth - 14, bottomY, {
      align: "right"
    });
  } catch (e) {
    // don't block PDF creation if footer timestamp fails
    console.warn("Failed to append PDF timestamp:", e);
  }

  return doc.output("arraybuffer");
}
