/**
 * Helper to get effective tenant slug for dashboard pages
 * Falls back to user's first membership when no subdomain is present (e.g., on Vercel)
 */

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { TENANT_HEADER } from "@/lib/tenant";
import { getCurrentUser } from "@/modules/auth";

export interface EffectiveTenantResult {
  tenantSlug: string | null;
  agency: {
    id: string;
    name: string;
    slug: string;
  } | null;
  userId: string | null;
}

/**
 * Get the effective tenant for server components
 * Returns the tenant from subdomain header, or falls back to user's first agency
 */
export async function getEffectiveTenant(): Promise<EffectiveTenantResult> {
  const headersList = await headers();
  let tenantSlug = headersList.get(TENANT_HEADER);
  
  const user = await getCurrentUser();
  
  if (!user) {
    return { tenantSlug: null, agency: null, userId: null };
  }

  // If no tenant slug from subdomain, get user's first membership
  if (!tenantSlug) {
    const firstMembership = await db.membership.findFirst({
      where: { userId: user.id },
      include: {
        agency: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (firstMembership) {
      tenantSlug = firstMembership.agency.slug;
      return {
        tenantSlug,
        agency: firstMembership.agency,
        userId: user.id,
      };
    }

    return { tenantSlug: null, agency: null, userId: user.id };
  }

  // Get agency from tenant slug
  const agency = await db.agency.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true, slug: true },
  });

  return {
    tenantSlug,
    agency,
    userId: user.id,
  };
}
