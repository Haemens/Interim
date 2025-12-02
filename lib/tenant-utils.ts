/**
 * Edge-compatible tenant utilities for subdomain-based tenant resolution
 * This file contains NO database imports and can be used in Edge Runtime (middleware)
 */

const MAIN_DOMAINS = ["localhost", "questhire.com", "questhire.vercel.app", "interim-five.vercel.app"];

// Vercel preview/production domains that should NOT be treated as tenant subdomains
const VERCEL_DOMAINS = ["vercel.app"];

/**
 * Check if hostname is a Vercel deployment domain (not a tenant subdomain)
 */
function isVercelDeploymentDomain(hostname: string): boolean {
  // Match patterns like: interim-five.vercel.app, interim-abc123-haemens.vercel.app
  if (!hostname.endsWith(".vercel.app")) return false;
  
  const parts = hostname.split(".");
  // vercel.app domains have format: [project-name].vercel.app or [project-name]-[hash]-[team].vercel.app
  // These are NOT tenant subdomains
  return parts.length <= 3 || parts[0].includes("-");
}

/**
 * Header name for passing tenant slug through middleware
 */
export const TENANT_HEADER = "x-tenant-slug";

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

  // Check if it's a Vercel deployment domain (not a tenant subdomain)
  if (isVercelDeploymentDomain(hostname)) {
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
