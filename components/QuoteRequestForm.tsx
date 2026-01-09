"use client";
import { useState } from "react";
interface QuoteRequestFormProps {
  productId: string;
  productSku?: string;
  productName: string;
  defaultQuantity?: number;
  small?: boolean;
}

export default function QuoteRequestForm({
  productId,
  productSku,
  productName,
  defaultQuantity = 1,
  small = false
}: QuoteRequestFormProps) {
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [location, setLocation] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch("/api/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          productSku,
          productName,
          quantity,
          location,
          poNumber,
          email
        })
      });
      if (res.ok) {
        setSuccess("Quote request sent successfully.");
        setLocation("");
        setPoNumber("");
        setEmail("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send quote request.");
      }
    } catch (err) {
      setError("Network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`mt-4 p-4 border rounded-lg bg-gray-50 ${
        small ? "max-w-md text-sm" : ""
      }`}
    >
      <h3 className={`font-bold mb-4 ${small ? "text-base" : "text-lg"}`}>
        Quote Request
      </h3>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Quantity</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={e => setQuantity(Number(e.target.value))}
          className="w-full border px-3 py-2 rounded"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">
          Location (optional)
        </label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">
          PO Number (optional)
        </label>
        <input
          type="text"
          value={poNumber}
          onChange={e => setPoNumber(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded font-bold mt-2 disabled:bg-gray-400"
      >
        {isSubmitting ? "Submitting..." : "Send Quote Request"}
      </button>
      {success && <p className="text-green-600 mt-3">{success}</p>}
      {error && <p className="text-red-600 mt-3">{error}</p>}
    </form>
  );
}
