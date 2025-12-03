/**
 * LinkedIn OAuth - Initiate Authorization
 * 
 * GET /api/auth/social/linkedin
 * Redirects user to LinkedIn OAuth authorization page
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ENV } from "@/lib/env";
import { getTenantSlugFromRequest } from "@/lib/tenant";
import { logInfo, logError } from "@/lib/log";

// LinkedIn OAuth configuration
const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_SCOPES = [
  "openid",
  "profile",
  "w_member_social", // Required for posting
].join(" ");

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Get tenant slug
    const tenantSlug = getTenantSlugFromRequest(request);
    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Check if LinkedIn OAuth is configured
    if (!ENV.LINKEDIN_CLIENT_ID || !ENV.LINKEDIN_CLIENT_SECRET) {
      logError("LinkedIn OAuth not configured");
      return NextResponse.json(
        { error: "LinkedIn integration is not configured. Please contact support." },
        { status: 503 }
      );
    }

    // Build callback URL
    const callbackUrl = new URL("/api/auth/social/linkedin/callback", ENV.NEXTAUTH_URL);
    
    // Create state parameter (includes tenant slug for multi-tenancy)
    const state = Buffer.from(JSON.stringify({
      tenantSlug,
      userId: session.user.id,
      timestamp: Date.now(),
    })).toString("base64url");

    // Build LinkedIn authorization URL
    const authUrl = new URL(LINKEDIN_AUTH_URL);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", ENV.LINKEDIN_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", callbackUrl.toString());
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", LINKEDIN_SCOPES);

    logInfo("LinkedIn OAuth initiated", {
      tenantSlug,
      userId: session.user.id,
    });

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    logError("LinkedIn OAuth initiation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to initiate LinkedIn authorization" },
      { status: 500 }
    );
  }
}
