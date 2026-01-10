import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  try {
    const host = request.headers.get("host") || "";
    const hostOnly = normalizeHost(host);

    const newHeaders = new Headers(request.headers);
    newHeaders.set("x-tenant-host", hostOnly);

    return NextResponse.next({ request: { headers: newHeaders } });
  } catch (err) {
    // Fail open: don't block requests if middleware has an unexpected error
    console.error("middleware: tenant header set failed", err);
    return NextResponse.next();
  }
}

// Exposed helper for computing a normalized tenant host from Headers
export function computeTenantHostFromHeaders(headers: Headers) {
  const host = headers.get("x-tenant-host") || headers.get("host") || "";
  return normalizeHost(host);
}

export function normalizeHost(host: string) {
  return host.split(":")[0].toLowerCase();
}

export const config = {
  matcher: "/:path*"
};
