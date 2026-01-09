"use client";
import React from "react";
import type { QuoteRequest } from "../../types";

export default function QuoteActions({
  id,
  quote,
  setQuote,
  statusLoading,
  setStatusLoading,
  statusMsg,
  setStatusMsg
}: {
  id?: string;
  quote: QuoteRequest;
  setQuote: React.Dispatch<React.SetStateAction<QuoteRequest | null>>;
  statusLoading: boolean;
  setStatusLoading: (b: boolean) => void;
  statusMsg: string | null;
  setStatusMsg: (s: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="font-semibold mr-2">Change Status</label>
            <select
              className="border rounded px-2 py-1"
              value={quote.status}
              onChange={e =>
                setQuote(quote ? { ...quote, status: e.target.value } : quote)
              }
            >
              <option value="requested">requested</option>
              <option value="quoted">quoted</option>
              <option value="ordered">ordered</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          {quote.status === "quoted" && (
            <div>
              <label className="font-semibold mr-2">Price Each</label>
              <input
                type="number"
                className="border rounded px-2 py-1 w-32"
                value={quote.price ?? ""}
                onChange={e =>
                  setQuote(
                    quote
                      ? {
                          ...quote,
                          price:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value)
                        }
                      : quote
                  )
                }
                placeholder="Enter price per unit"
              />
            </div>
          )}

          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 min-w-40 text-center disabled:opacity-50"
            disabled={statusLoading}
            onClick={async () => {
              if (!id || !quote) return;
              setStatusLoading(true);
              setStatusMsg(null);
              try {
                const res = await fetch(`/api/admin/quotes/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    status: quote.status,
                    price: Number(quote.price)
                  })
                });
                if (res.ok) {
                  const updated = await res.json();
                  setQuote(updated);
                  setStatusMsg("Status updated successfully.");
                } else {
                  setStatusMsg("Failed to update status.");
                }
              } catch (e) {
                console.error(e);
                setStatusMsg("Error occurred.");
              }
              setStatusLoading(false);
            }}
          >
            {statusLoading ? "Changing..." : "Change Status"}
          </button>

          {statusMsg && (
            <span className="ml-2 text-sm text-gray-700">{statusMsg}</span>
          )}
        </div>

        <div className="flex gap-3 items-center justify-end">
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 min-w-40 text-center disabled:opacity-50"
            disabled={statusLoading}
            onClick={async () => {
              if (!id || !quote) return;
              setStatusLoading(true);
              setStatusMsg(null);
              try {
                const res = await fetch(
                  `/api/admin/quotes/${id}/generate-pdf`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({})
                  }
                );
                if (res.ok) {
                  const updated = await res.json();
                  setQuote(updated);
                  setStatusMsg("Quote PDF generated and sent via email.");
                } else {
                  setStatusMsg("Failed to generate/send quote PDF.");
                }
              } catch (e) {
                console.error(e);
                setStatusMsg("Error occurred while generating/sending PDF.");
              }
              setStatusLoading(false);
            }}
          >
            {statusLoading ? "Processing..." : "Generate & Send Quote PDF"}
          </button>

          {quote.quoteFileUrl && (
            <a
              href={quote.quoteFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Download Quote File
            </a>
          )}

          <button
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 min-w-40 text-center disabled:opacity-50"
            disabled={statusLoading || !quote}
            onClick={async () => {
              if (!id || !quote) return;

              // If an order already exists for this quote, ask for confirmation
              if (quote.orderId) {
                const proceed = window.confirm(
                  `An order already exists for this quote (Order ID: ${quote.orderId}). Proceeding will replace the existing order. Do you want to continue?`
                );
                if (!proceed) return;
              }

              setStatusLoading(true);
              setStatusMsg(null);
              try {
                const res = await fetch(`/api/admin/quotes/${id}/convert`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({})
                });
                if (res.ok) {
                  const body = await res.json();
                  // refetch full quote to ensure relations (product/requester) and orderId are up-to-date
                  try {
                    const ref = await fetch(`/api/admin/quotes/${id}`);
                    if (ref.ok) {
                      const latest = await ref.json();
                      setQuote(latest);
                    } else {
                      // fallback to API response
                      setQuote(body.quote || null);
                    }
                  } catch {
                    setQuote(body.quote || null);
                  }
                  setStatusMsg(
                    body.order
                      ? `Quote converted to order ${body.order.id}`
                      : "Quote converted to order successfully."
                  );
                } else {
                  const err = await res.json();
                  setStatusMsg(err.error || "Failed to convert to order.");
                }
              } catch (e) {
                console.error(e);
                setStatusMsg("Error occurred while converting to order.");
              }
              setStatusLoading(false);
            }}
          >
            {statusLoading ? "Converting..." : "Convert to Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
