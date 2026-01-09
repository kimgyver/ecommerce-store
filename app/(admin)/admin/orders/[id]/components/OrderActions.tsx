"use client";

import { useState } from "react";
import { Toast } from "@/components/toast";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  currentStatus: string;
};

export default function OrderActions({ orderId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error" | "info";
  } | null>(null);

  const statuses = [
    "pending",
    "processing",
    "paid",
    "shipped",
    "delivered",
    "cancelled"
  ];

  const handleUpdate = async () => {
    if (!confirm("Update order status?")) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (!res.ok) throw new Error("Failed to update");
      // refresh server data
      router.refresh();
      setToast({ message: "Order status updated", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to update order status", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <label className="block text-sm text-gray-600">Change status</label>
      <div className="flex gap-2">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          {statuses.map(s => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <button
          onClick={handleUpdate}
          disabled={loading || status === currentStatus}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update"}
        </button>
      </div>
    </div>
  );
}
