import React from "react";
import { headers } from "next/headers";
import { getTenantForHost } from "@/lib/tenant";
import { TenantProviderClient } from "./tenant-context";

export default async function TenantServerProvider({
  children
}: {
  children: React.ReactNode;
}) {
  // `headers()` can return a Headers-like object (with .get) or a plain object in some runtimes.
  // Be defensive and support both shapes.
  const hdrsCandidate = await Promise.resolve(headers());
  const hdrs: any = hdrsCandidate || {};
  let host: string | undefined;
  if (hdrs && typeof hdrs.get === "function") {
    host = hdrs.get("x-tenant-host") || hdrs.get("host");
  } else if (hdrs && typeof hdrs === "object") {
    // plain object shape: try common keys
    host =
      hdrs["x-tenant-host"] ||
      hdrs["host"] ||
      hdrs["X-Tenant-Host"] ||
      hdrs["Host"];
  }
  const tenant = await getTenantForHost(host || undefined);
  // Render the client TenantProvider with the resolved tenant
  return (
    <TenantProviderClient tenant={tenant}>{children}</TenantProviderClient>
  );
}
