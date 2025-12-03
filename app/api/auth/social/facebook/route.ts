/**
 * Facebook OAuth - Initiate Authorization
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ENV } from "@/lib/env";
import { getTenantSlugFromRequest } from "@/lib/tenant";
import { logInfo, logError } from "@/lib/log";

const FACEBOOK_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";
const FACEBOOK_SCOPES = [
  "pages_show_list",
  "pages_read_engagement", 
  "pages_manage_posts",
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

    // Facebook uses same app as Instagram
    if (!ENV.INSTAGRAM_APP_ID || !ENV.INSTAGRAM_APP_SECRET) {
      logError("Facebook OAuth not configured");
      return NextResponse.json(
        { error: "Facebook integration is not configured." },
        { status: 503 }
      );
    }

    const callbackUrl = new URL("/api/auth/social/facebook/callback", ENV.NEXTAUTH_URL);
    
    const state = Buffer.from(JSON.stringify({
      tenantSlug,
      userId: session.user.id,
      timestamp: Date.now(),
    })).toString("base64url");

    const authUrl = new URL(FACEBOOK_AUTH_URL);
    authUrl.searchParams.set("client_id", ENV.INSTAGRAM_APP_ID);
    authUrl.searchParams.set("redirect_uri", callbackUrl.toString());
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", FACEBOOK_SCOPES);
    authUrl.searchParams.set("response_type", "code");

    logInfo("Facebook OAuth initiated", { tenantSlug, userId: session.user.id });

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    logError("Facebook OAuth initiation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to initiate Facebook authorization" }, { status: 500 });
  }
}
