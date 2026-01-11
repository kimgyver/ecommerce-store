"use client";

import React, { useState } from "react";

export default function TenantAdminEditor({
  distributor
}: {
  distributor: any;
}) {
  const [brandColor, setBrandColor] = useState(distributor.brandColor || "");
  const [logoUrl, setLogoUrl] = useState(distributor.logoUrl || "");
  const [emailDomain, setEmailDomain] = useState(distributor.emailDomain || "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/distributors/${distributor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandColor, logoUrl, emailDomain })
      });

      if (!res.ok) throw new Error("Update failed");
      alert("Saved");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border rounded-md bg-white">
      <h3 className="font-semibold">{distributor.name}</h3>
      <div className="mt-2 grid grid-cols-1 gap-2">
        <label className="text-xs">Email domain</label>
        <input
          value={emailDomain}
          onChange={e => setEmailDomain(e.target.value)}
          className="border px-2 py-1 rounded"
        />

        <label className="text-xs">Brand color</label>
        <input
          value={brandColor}
          onChange={e => setBrandColor(e.target.value)}
          className="border px-2 py-1 rounded"
        />

        <label className="text-xs">Logo URL</label>
        <input
          value={logoUrl}
          onChange={e => setLogoUrl(e.target.value)}
          className="border px-2 py-1 rounded"
        />

        <div className="flex gap-2 mt-2">
          <button
            onClick={save}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
