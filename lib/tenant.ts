/**
 * Multi-tenant utilities for subdomain-based tenant resolution
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { Agency } from "@prisma/client";

const MAIN_DOMAINS = ["localhost", "questhire.com", "questhire.vercel.app"];

/**
 * Header name for passing tenant slug through middleware
 */
export const TENANT_HEADER = "x-tenant-slug";

// =============================================================================
// CLIENT-SIDE HELPERS
// =============================================================================

/**
 * Extract tenant slug from host header
 * Handles: tenantSlug.localhost:3000, tenantSlug.questhire.com
 * Returns null for main domain (no subdomain)
 */
export function getTenantFromHost(host: string | null): string | null {
  if (!host) return null;

  // Remove port if present
  const hostname = host.split(":")[0];

  // Check if it's a main domain without subdomain
  if (MAIN_DOMAINS.includes(hostname)) {
    return null;
  }

  // Extract subdomain
  const parts = hostname.split(".");

  // Need at least 2 parts for subdomain.domain
  if (parts.length < 2) {
    return null;
  }

  // For localhost: tenant.localhost
  if (parts[parts.length - 1] === "localhost") {
    return parts[0];
  }

  // For production: tenant.questhire.com (3 parts) or tenant.questhire.vercel.app (4 parts)
  // The subdomain is always the first part
  const subdomain = parts[0];

  // Validate subdomain format (alphanumeric and hyphens, 3-63 chars)
  if (!isValidTenantSlug(subdomain)) {
    return null;
  }

  return subdomain;
}

/**
 * Validate tenant slug format
 * Must be lowercase alphanumeric with hyphens, 2-63 characters
 */
export function isValidTenantSlug(slug: string): boolean {
  // Allow shorter slugs (2+ chars) for flexibility
  const slugRegex = /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]?$/;
  return slug.length >= 2 && slugRegex.test(slug);
}

/**
 * Build full URL for a tenant
 */
export function getTenantUrl(tenantSlug: string, path: string = ""): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL(baseUrl);

  if (url.hostname === "localhost") {
    url.hostname = `${tenantSlug}.localhost`;
  } else {
    const parts = url.hostname.split(".");
    url.hostname = `${tenantSlug}.${parts.slice(-2).join(".")}`;
  }

  url.pathname = path;
  return url.toString();
}

/**
 * Get tenant slug from request headers (for use in server components/actions)
 */
export function getTenantFromHeaders(headers: Headers): string | null {
  return headers.get(TENANT_HEADER);
}

// =============================================================================
// SERVER-SIDE HELPERS (for API routes)
// =============================================================================

/**
 * Extract tenant slug from NextRequest (API routes)
 */
export function getTenantSlugFromRequest(request: NextRequest): string | null {
  // First try the header (set by middleware)
  const fromHeader = request.headers.get(TENANT_HEADER);
  if (fromHeader) return fromHeader;

  // Fallback to parsing host
  const host = request.headers.get("host");
  return getTenantFromHost(host);
}

/**
 * Error thrown when tenant is not found
 */
export class TenantNotFoundError extends Error {
  constructor(slug: string) {
    super(`Agency not found for slug: ${slug}`);
    this.name = "TenantNotFoundError";
  }
}

/**
 * Error thrown when tenant slug is missing
 */
export class TenantRequiredError extends Error {
  constructor() {
    super("Tenant slug is required but was not provided");
    this.name = "TenantRequiredError";
  }
}

/**
 * Get agency by slug, throws if not found
 */
export async function getCurrentAgencyOrThrow(
  tenantSlug: string
): Promise<Agency> {
  const agency = await db.agency.findUnique({
    where: { slug: tenantSlug },
  });

  if (!agency) {
    throw new TenantNotFoundError(tenantSlug);
  }

  return agency;
}

/**
 * Get agency by slug from request, throws if not found
 */
export async function getAgencyFromRequestOrThrow(
  request: NextRequest
): Promise<{ agency: Agency; tenantSlug: string }> {
  const tenantSlug = getTenantSlugFromRequest(request);

  if (!tenantSlug) {
    throw new TenantRequiredError();
  }

  const agency = await getCurrentAgencyOrThrow(tenantSlug);
  return { agency, tenantSlug };
}
