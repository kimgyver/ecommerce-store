"use client";
import React from "react";

import type { QuoteRequest } from "../../types";

export default function QuoteBasicInfo({ quote }: { quote: QuoteRequest }) {
  const statusColor = (s: string) => {
    switch (s) {
      case "quoted":
        return "bg-yellow-100 text-yellow-800";
      case "ordered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="border-b pb-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div>
            <div className="font-semibold">Product</div>
            <div className="text-sm text-gray-800">
              {quote.product
                ? `${quote.product.sku} - ${quote.product.name}`
                : "-"}
            </div>
          </div>

          <div>
            <span className="font-semibold">Quantity:</span>{" "}
            <span className="text-sm">{quote.quantity ?? "-"}</span>
          </div>

          {quote.notes && (
            <div>
              <div className="font-semibold">Notes:</div>
              <div className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                {quote.notes}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div>
            <div className="font-semibold">Requester</div>
            <div className="text-sm text-gray-800">
              {quote.requester ? (
                <>
                  {quote.requester.email}
                  {quote.requester.name ? ` (${quote.requester.name})` : ""}
                </>
              ) : (
                "-"
              )}
            </div>
          </div>

          <div>
            <div className="font-semibold">Requested At</div>
            <div className="text-sm">
              {new Date(quote.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <div className="font-semibold">Status</div>
              <div>
                <span
                  className={`inline-block px-2 py-1 rounded text-sm font-medium ${statusColor(
                    quote.status
                  )}`}
                >
                  {quote.status}
                </span>
              </div>
            </div>

            {(quote.status === "quoted" || quote.status === "ordered") &&
              quote.price != null && (
                <div className="ml-auto text-right">
                  <div className="font-semibold">Price Each</div>
                  <div className="text-blue-700 text-lg font-bold">
                    {typeof quote.price === "number"
                      ? `$${quote.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}`
                      : quote.price}
                  </div>
                  <div className="font-semibold mt-2">Total Quoted Price</div>
                  <div className="text-green-700 text-lg font-bold">
                    {typeof quote.price === "number" && quote.quantity
                      ? `$${(quote.price * quote.quantity).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }
                        )}`
                      : "-"}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
