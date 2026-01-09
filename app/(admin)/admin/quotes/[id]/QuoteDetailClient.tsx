"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QuoteStatusBanner from "./components/QuoteStatusBanner";
import QuoteBasicInfo from "./components/QuoteBasicInfo";
import QuoteActions from "./components/QuoteActions";

// Types
import type { QuoteRequest } from "../types";

export default function QuoteDetailClient() {
  const params = useParams();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : undefined;
  const [quote, setQuote] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Note: loading state and result message for status changes
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (!id) {
      setError("No quote id provided");
      setLoading(false);
      return;
    }
    fetch(`/api/admin/quotes/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(data => {
        setQuote(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  return (
    <div className="p-8">
      <QuoteStatusBanner orderId={quote?.orderId} />
      <Link href="/admin/quotes" className="text-blue-600 hover:underline">
        &larr; Back to Quotes
      </Link>
      <h1 className="text-2xl font-bold mb-4 mt-4">Quote Request Detail</h1>
      <div className="bg-white rounded shadow p-6 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : !quote ? (
          <p>Quote request not found.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <QuoteBasicInfo quote={quote} />
              </div>
              <div className="md:col-span-1">
                <QuoteActions
                  id={id}
                  quote={quote}
                  setQuote={setQuote}
                  statusLoading={statusLoading}
                  setStatusLoading={setStatusLoading}
                  statusMsg={statusMsg}
                  setStatusMsg={setStatusMsg}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // --- AddNoteButton component (single, correct version at end of file) ---
  // AddNoteButton component removed
}
