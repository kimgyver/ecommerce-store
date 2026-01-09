"use client";
import React from "react";
import Link from "next/link";

export default function QuoteStatusBanner({
  orderId
}: {
  orderId?: string | null;
}) {
  if (!orderId) return null;
  return (
    <div className="mb-4 p-3 bg-green-50 text-green-800 rounded border border-green-200 flex items-center justify-between">
      <div className="font-semibold">An order was created for this quote.</div>
      <div>
        <Link
          href={`/admin/orders/${orderId}`}
          className="text-green-700 underline font-medium"
        >
          View Order ({orderId})
        </Link>
      </div>
    </div>
  );
}
