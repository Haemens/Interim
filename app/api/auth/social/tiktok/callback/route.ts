/**
 * TikTok OAuth - Callback Handler
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ENV } from "@/lib/env";
import { logInfo, logError } from "@/lib/log";

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/channels?error=${encodeURIComponent(error)}`, ENV.NEXTAUTH_URL)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Missing+parameters", ENV.NEXTAUTH_URL)
      );
    }

    // Parse state (format: base64data|csrftoken)
    const [stateBase64] = state.split("|");
    let stateData: { tenantSlug: string; userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(stateBase64, "base64url").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Invalid+state", ENV.NEXTAUTH_URL)
      );
    }

    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Authorization+expired", ENV.NEXTAUTH_URL)
      );
    }

    const agency = await db.agency.findUnique({
      where: { slug: stateData.tenantSlug },
    });

    if (!agency) {
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Agency+not+found", ENV.NEXTAUTH_URL)
      );
    }

    const callbackUrl = new URL("/api/auth/social/tiktok/callback", ENV.NEXTAUTH_URL);

    // Exchange code for access token
    const tokenResponse = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: ENV.TIKTOK_CLIENT_KEY!,
        client_secret: ENV.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl.toString(),
      }),
    });

    if (!tokenResponse.ok) {
      logError("TikTok token exchange failed", { status: tokenResponse.status });
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Token+exchange+failed", ENV.NEXTAUTH_URL)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const openId = tokenData.open_id;

    // Get user info
    const userInfoResponse = await fetch(
      `${TIKTOK_USERINFO_URL}?fields=open_id,display_name,avatar_url`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    let displayName = "TikTok User";
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      displayName = userInfo.data?.user?.display_name || displayName;
    }

    // Store the account
    const socialAccount = await db.socialAccount.upsert({
      where: {
        agencyId_provider_providerAccountId: {
          agencyId: agency.id,
          provider: "TIKTOK",
          providerAccountId: openId,
        },
      },
      update: {
        accountName: displayName,
        accessToken,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt: tokenData.expires_in 
          ? new Date(Date.now() + tokenData.expires_in * 1000) 
          : null,
        scope: tokenData.scope,
        isActive: true,
        lastError: null,
      },
      create: {
        agencyId: agency.id,
        provider: "TIKTOK",
        providerAccountId: openId,
        accountName: displayName,
        accountType: "creator",
        accessToken,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt: tokenData.expires_in 
          ? new Date(Date.now() + tokenData.expires_in * 1000) 
          : null,
        scope: tokenData.scope,
        isActive: true,
      },
    });

    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        userId: stateData.userId,
        type: "SOCIAL_ACCOUNT_CONNECTED",
        payload: { provider: "TIKTOK", accountId: socialAccount.id },
      },
    });

    logInfo("TikTok account connected", { agencyId: agency.id, accountId: socialAccount.id });

    return NextResponse.redirect(
      new URL("/dashboard/channels?success=TikTok+connected", ENV.NEXTAUTH_URL)
    );
  } catch (error) {
    logError("TikTok OAuth callback failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL("/dashboard/channels?error=Connection+failed", ENV.NEXTAUTH_URL)
    );
  }
}
