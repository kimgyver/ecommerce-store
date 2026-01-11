"use client";

import React from "react";

interface Props {
  name: string;
  setName: (v: string) => void;
  emailDomain: string;
  setEmailDomain: (v: string) => void;
  onSave?: () => Promise<void> | void;
  onCancel?: () => void;
  isSaving?: boolean;
}

export default function CompanyBasics({
  name,
  setName,
  emailDomain,
  setEmailDomain,
  onSave,
  onCancel,
  isSaving
}: Props) {
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Company Basics</h3>
        <p className="text-sm text-gray-600">Basic company information</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Company Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Chromet Inc."
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Email Domain
          </label>
          <input
            type="text"
            value={emailDomain}
            onChange={e => setEmailDomain(e.target.value)}
            placeholder="example.com"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onSave && onSave()}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
