/**
 * Instagram OAuth - Initiate Authorization
 * 
 * GET /api/auth/social/instagram
 * Redirects user to Instagram/Facebook OAuth authorization page
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ENV } from "@/lib/env";
import { getTenantSlugFromRequest } from "@/lib/tenant";
import { logInfo, logError } from "@/lib/log";

// Instagram uses Facebook's OAuth (Meta Business Suite)
const INSTAGRAM_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";
const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
].join(",");

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const tenantSlug = getTenantSlugFromRequest(request);
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    if (!ENV.INSTAGRAM_APP_ID || !ENV.INSTAGRAM_APP_SECRET) {
      logError("Instagram OAuth not configured");
      return NextResponse.json(
        { error: "Instagram integration is not configured." },
        { status: 503 }
      );
    }

    const callbackUrl = new URL("/api/auth/social/instagram/callback", ENV.NEXTAUTH_URL);
    
    const state = Buffer.from(JSON.stringify({
      tenantSlug,
      userId: session.user.id,
      timestamp: Date.now(),
    })).toString("base64url");

    const authUrl = new URL(INSTAGRAM_AUTH_URL);
    authUrl.searchParams.set("client_id", ENV.INSTAGRAM_APP_ID);
    authUrl.searchParams.set("redirect_uri", callbackUrl.toString());
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", INSTAGRAM_SCOPES);
    authUrl.searchParams.set("response_type", "code");

    logInfo("Instagram OAuth initiated", { tenantSlug, userId: session.user.id });

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    logError("Instagram OAuth initiation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to initiate Instagram authorization" }, { status: 500 });
  }
}
