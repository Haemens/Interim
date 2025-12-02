import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTenantFromHost, TENANT_HEADER } from "@/lib/tenant-utils";

/**
 * Middleware for multi-tenant subdomain resolution
 * Extracts tenant slug from host and attaches it to request headers
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host");
  const tenantSlug = getTenantFromHost(host);

  // Clone the request headers
  const requestHeaders = new Headers(request.headers);

  // Add tenant slug to headers for downstream consumption
  if (tenantSlug) {
    requestHeaders.set(TENANT_HEADER, tenantSlug);
  }

  // Create response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Also set tenant in response headers for client-side access
  if (tenantSlug) {
    response.headers.set(TENANT_HEADER, tenantSlug);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
