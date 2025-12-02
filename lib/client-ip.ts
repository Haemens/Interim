/**
 * Client IP extraction utilities for rate limiting
 */

import { NextRequest } from "next/server";

/**
 * Extract client IP from request headers
 * 
 * Checks common proxy headers in order of preference:
 * 1. CF-Connecting-IP (Cloudflare)
 * 2. X-Real-IP (nginx)
 * 3. X-Forwarded-For (standard proxy header, first IP)
 * 4. Fallback to "unknown"
 */
export function getClientIp(request: NextRequest): string {
  // Cloudflare
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Nginx / other proxies
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Standard proxy header (may contain multiple IPs)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP (original client)
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  // Vercel-specific
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const firstIp = vercelIp.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  return "unknown";
}

/**
 * Hash an IP for privacy-conscious logging
 */
export function hashIp(ip: string): string {
  // Simple hash for logging - not cryptographically secure
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).slice(0, 8);
}
