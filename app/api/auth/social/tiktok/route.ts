/**
 * TikTok OAuth - Initiate Authorization
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ENV } from "@/lib/env";
import { getTenantSlugFromRequest } from "@/lib/tenant";
import { logInfo, logError } from "@/lib/log";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_SCOPES = ["user.info.basic", "video.publish", "video.upload"].join(",");

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

    if (!ENV.TIKTOK_CLIENT_KEY || !ENV.TIKTOK_CLIENT_SECRET) {
      logError("TikTok OAuth not configured");
      return NextResponse.json(
        { error: "TikTok integration is not configured." },
        { status: 503 }
      );
    }

    const callbackUrl = new URL("/api/auth/social/tiktok/callback", ENV.NEXTAUTH_URL);
    
    const state = Buffer.from(JSON.stringify({
      tenantSlug,
      userId: session.user.id,
      timestamp: Date.now(),
    })).toString("base64url");

    // TikTok requires CSRF state
    const csrfState = Math.random().toString(36).substring(2);

    const authUrl = new URL(TIKTOK_AUTH_URL);
    authUrl.searchParams.set("client_key", ENV.TIKTOK_CLIENT_KEY);
    authUrl.searchParams.set("redirect_uri", callbackUrl.toString());
    authUrl.searchParams.set("state", `${state}|${csrfState}`);
    authUrl.searchParams.set("scope", TIKTOK_SCOPES);
    authUrl.searchParams.set("response_type", "code");

    logInfo("TikTok OAuth initiated", { tenantSlug, userId: session.user.id });

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    logError("TikTok OAuth initiation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to initiate TikTok authorization" }, { status: 500 });
  }
}
