"use client";

import React from "react";
import type { DistributorDomain } from "@/types/distributor";

interface Props {
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  brandColor: string;
  setBrandColor: (v: string) => void;
  cname: string;
  setCname: (v: string) => void;
  onSave?: () => Promise<void> | void;
  isSaving?: boolean;
  onAddDomain?: (domain: string) => Promise<DistributorDomain | null>;
  domains?: DistributorDomain[];
  onVerifyDomain?: (domainId: string) => Promise<DistributorDomain | null>;
  onDeleteDomain?: (domainId: string) => Promise<void>;
}

export default function DomainsOnboarding({
  logoUrl,
  setLogoUrl,
  brandColor,
  setBrandColor,
  cname,
  setCname,
  onSave,
  isSaving,
  onAddDomain,
  domains,
  onVerifyDomain,
  onDeleteDomain
}: Props) {
  const [verifying, setVerifying] = React.useState(false);
  const [verifyMsg, setVerifyMsg] = React.useState<string | null>(null);
  const [verifyRecords, setVerifyRecords] = React.useState<string[] | null>(
    null
  );
  const [persistedDomain, setPersistedDomain] =
    React.useState<DistributorDomain | null>(null);
  const [rowLoading, setRowLoading] = React.useState<Record<string, boolean>>(
    {}
  );
  const [isAdding, setIsAdding] = React.useState(false);

  React.useEffect(() => {
    // Reset verification state when cname changes
    setVerifyMsg(null);
    setVerifyRecords(null);
    setPersistedDomain(null);
    if (domains && cname) {
      const found = domains.find((d: DistributorDomain) => d.domain === cname);
      if (found) setPersistedDomain(found);
    }
  }, [cname, domains]);

  const handleVerify = async () => {
    if (!cname) return;
    setVerifying(true);
    setVerifyMsg(null);
    setVerifyRecords(null);
    try {
      // If domain exists in DB, call server-side verify endpoint; otherwise, create then verify
      let domainObj =
        domains?.find((d: DistributorDomain) => d.domain === cname) || null;
      if (!domainObj && onAddDomain) {
        const created = await onAddDomain(cname);
        domainObj = created || null;
      }

      if (!domainObj) {
        setVerifyMsg("Domain must be added before verification");
        return;
      }

      if (!onVerifyDomain) {
        setVerifyMsg("Verification not available");
        return;
      }

      const updated = await onVerifyDomain(domainObj.id);
      if (updated) {
        setPersistedDomain(updated);
        setVerifyRecords(updated.details?.records || null);
        setVerifyMsg(
          updated.status === "verified"
            ? "verified"
            : updated.details?.error || "failed"
        );
      }
    } catch (err) {
      setVerifyMsg(String(err));
    } finally {
      setVerifying(false);
    }
  };
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Domains & Onboarding</h3>
        <p className="text-sm text-gray-600">
          Logo, brand color and domain settings
        </p>
      </div>

      <div className="space-y-4">
        {domains && domains.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Configured Domains</h4>
            <div className="space-y-2">
              {domains.map((d: DistributorDomain) => {
                const isSelected = cname && d.domain === cname;
                const checkedAt = d.lastCheckedAt
                  ? new Date(d.lastCheckedAt)
                  : null;
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      setCname(d.domain);
                      setPersistedDomain(d);
                    }}
                    className={`flex items-center justify-between p-3 rounded border cursor-pointer ${
                      isSelected ? "bg-white border-blue-300" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{d.domain}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            d.status === "verified"
                              ? "bg-green-100 text-green-800"
                              : d.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {d.status}
                        </span>
                        {checkedAt && (
                          <time className="text-xs text-gray-400">
                            {checkedAt.toLocaleString()}
                          </time>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          setRowLoading((prev: Record<string, boolean>) => ({
                            ...prev,
                            [d.id]: true
                          }));
                          try {
                            setCname(d.domain);
                            if (onVerifyDomain) {
                              const updated = await onVerifyDomain(d.id);
                              if (updated) {
                                setPersistedDomain(updated);
                                setVerifyRecords(
                                  updated.details?.records || null
                                );
                                setVerifyMsg(
                                  updated.status === "verified"
                                    ? "verified"
                                    : updated.details?.error || "failed"
                                );
                              }
                            }
                          } finally {
                            setRowLoading((prev: Record<string, boolean>) => ({
                              ...prev,
                              [d.id]: false
                            }));
                          }
                        }}
                        disabled={!!rowLoading[d.id]}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded disabled:opacity-40"
                      >
                        {rowLoading[d.id] ? "Verifying..." : "Verify"}
                      </button>

                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          if (!confirm(`Delete ${d.domain}?`)) return;
                          setRowLoading((prev: Record<string, boolean>) => ({
                            ...prev,
                            [d.id]: true
                          }));
                          try {
                            if (onDeleteDomain) await onDeleteDomain(d.id);
                          } finally {
                            setRowLoading((prev: Record<string, boolean>) => ({
                              ...prev,
                              [d.id]: false
                            }));
                          }
                        }}
                        disabled={!!rowLoading[d.id]}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded disabled:opacity-40"
                      >
                        {rowLoading[d.id] ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Selected (New) Domain
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={cname}
              onChange={e => setCname(e.target.value)}
              placeholder="cname.example.com"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleVerify}
              disabled={!cname || verifying}
              className="px-3 py-2 bg-gray-100 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {verifying ? "Checking..." : "Verify"}
            </button>
            {persistedDomain?.status === "verified" && (
              <span className="text-xs font-semibold text-green-600">
                verified
              </span>
            )}
            {persistedDomain?.status === "failed" && (
              <span className="text-xs font-semibold text-red-600">failed</span>
            )}
          </div>
          {verifyMsg && (
            <div className="text-xs text-gray-500 mt-1">{verifyMsg}</div>
          )}
          {verifyRecords && (
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(verifyRecords, null, 2)}
            </pre>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Logo URL
          </label>
          <input
            type="text"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Brand Color
          </label>
          <input
            type="text"
            value={brandColor}
            onChange={e => setBrandColor(e.target.value)}
            placeholder="#0066CC"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={async () => {
              // Save company fields first
              if (onSave) await onSave();

              // If no cname, nothing to do
              if (!cname) return;

              // If domain already exists, don't call add (server will reject). Instead, verify it (if handler provided)
              const existing = domains?.find(
                (d: DistributorDomain) => d.domain === cname
              );
              if (existing) {
                if (onVerifyDomain) {
                  const updated = await onVerifyDomain(existing.id);
                  if (updated) setPersistedDomain(updated);
                }
                return;
              }

              // Otherwise add the domain
              if (onAddDomain) {
                await onAddDomain(cname);
              }
            }}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
