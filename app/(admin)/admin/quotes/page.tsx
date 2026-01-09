"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { QuoteRequest } from "./types";

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/quotes")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(data => {
        console.log("quotes API full response:", data);
        setQuotes(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Quote Requests</h1>
      <div className="bg-white rounded shadow p-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : quotes.length === 0 ? (
          <p>No quote requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-left">Quantity</th>
                  <th className="px-4 py-2 text-left">Requester</th>
                  <th className="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {/* quotes data */}
                {quotes
                  .filter(q => !!q.id)
                  .map(q => (
                    <tr key={q.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {q.createdAt
                          ? new Date(q.createdAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-2 capitalize">
                        {q.status || "-"}
                      </td>
                      <td className="px-4 py-2">
                        {q.product?.sku
                          ? `${q.product.sku} - ${q.product.name}`
                          : "-"}
                      </td>
                      <td className="px-4 py-2">{q.quantity ?? "-"}</td>
                      <td className="px-4 py-2">
                        {q.requester?.email || "-"}
                        {q.requester?.name ? ` (${q.requester.name})` : ""}
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/admin/quotes/${q.id}`}
                          className="text-blue-600 hover:underline"
                          onClick={() => console.log("View clicked id:", q.id)}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
