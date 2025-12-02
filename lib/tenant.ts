/**
 * Multi-tenant utilities for subdomain-based tenant resolution
 * This file contains server-side helpers that require database access
 * 
 * For Edge-compatible utilities (middleware), use @/lib/tenant-utils
 */

import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import type { Agency } from "@prisma/client";
import {
  TENANT_HEADER,
  getTenantFromHost,
  isValidTenantSlug,
  getTenantUrl,
  getTenantFromHeaders,
} from "@/lib/tenant-utils";

// Re-export Edge-compatible utilities for convenience
export {
  TENANT_HEADER,
  getTenantFromHost,
  isValidTenantSlug,
  getTenantUrl,
  getTenantFromHeaders,
};

// =============================================================================
// SERVER-SIDE HELPERS (for API routes - NOT Edge compatible)
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

/**
 * Get tenant slug from request, with fallback to user's first agency
 * This is useful for Vercel deployments without subdomain support
 */
export async function getTenantSlugWithFallback(
  request: NextRequest,
  userId: string | null
): Promise<string | null> {
  // First try the standard method
  const tenantSlug = getTenantSlugFromRequest(request);
  if (tenantSlug) return tenantSlug;

  // If no tenant slug and we have a user, get their first membership
  if (userId) {
    const firstMembership = await db.membership.findFirst({
      where: { userId },
      include: {
        agency: { select: { slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (firstMembership) {
      return firstMembership.agency.slug;
    }
  }

  return null;
}
