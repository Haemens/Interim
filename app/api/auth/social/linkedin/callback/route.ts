/**
 * LinkedIn OAuth - Callback Handler
 * 
 * GET /api/auth/social/linkedin/callback
 * Handles the OAuth callback from LinkedIn, exchanges code for tokens,
 * and stores the connected account.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ENV } from "@/lib/env";
import { logInfo, logError } from "@/lib/log";

// LinkedIn OAuth endpoints
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface LinkedInUserInfo {
  sub: string; // LinkedIn member ID
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      logError("LinkedIn OAuth error", { error, errorDescription });
      return NextResponse.redirect(
        new URL(`/dashboard/channels?error=${encodeURIComponent(errorDescription || error)}`, ENV.NEXTAUTH_URL)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      logError("LinkedIn OAuth callback missing parameters");
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Missing+authorization+parameters", ENV.NEXTAUTH_URL)
      );
    }

    // Decode and validate state
    let stateData: { tenantSlug: string; userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
      logError("LinkedIn OAuth invalid state");
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Invalid+state+parameter", ENV.NEXTAUTH_URL)
      );
    }

    // Check state timestamp (expire after 10 minutes)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      logError("LinkedIn OAuth state expired");
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Authorization+expired", ENV.NEXTAUTH_URL)
      );
    }

    // Get agency from tenant slug
    const agency = await db.agency.findUnique({
      where: { slug: stateData.tenantSlug },
    });

    if (!agency) {
      logError("LinkedIn OAuth agency not found", { tenantSlug: stateData.tenantSlug });
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Agency+not+found", ENV.NEXTAUTH_URL)
      );
    }

    // Build callback URL for token exchange
    const callbackUrl = new URL("/api/auth/social/linkedin/callback", ENV.NEXTAUTH_URL);

    // Exchange authorization code for access token
    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl.toString(),
        client_id: ENV.LINKEDIN_CLIENT_ID!,
        client_secret: ENV.LINKEDIN_CLIENT_SECRET!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      logError("LinkedIn token exchange failed", { status: tokenResponse.status, error: errorData });
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Failed+to+get+access+token", ENV.NEXTAUTH_URL)
      );
    }

    const tokenData: LinkedInTokenResponse = await tokenResponse.json();

    // Get user info from LinkedIn
    const userInfoResponse = await fetch(LINKEDIN_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      logError("LinkedIn userinfo failed", { status: userInfoResponse.status });
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Failed+to+get+user+info", ENV.NEXTAUTH_URL)
      );
    }

    const userInfo: LinkedInUserInfo = await userInfoResponse.json();

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Upsert the social account
    const socialAccount = await db.socialAccount.upsert({
      where: {
        agencyId_provider_providerAccountId: {
          agencyId: agency.id,
          provider: "LINKEDIN",
          providerAccountId: userInfo.sub,
        },
      },
      update: {
        accountName: userInfo.name,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt,
        scope: tokenData.scope,
        isActive: true,
        lastError: null,
        updatedAt: new Date(),
      },
      create: {
        agencyId: agency.id,
        provider: "LINKEDIN",
        providerAccountId: userInfo.sub,
        accountName: userInfo.name,
        accountType: "personal",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt,
        scope: tokenData.scope,
        isActive: true,
      },
    });

    // Log the event
    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        userId: stateData.userId,
        type: "SOCIAL_ACCOUNT_CONNECTED",
        payload: {
          provider: "LINKEDIN",
          accountId: socialAccount.id,
          accountName: userInfo.name,
        },
      },
    });

    logInfo("LinkedIn account connected", {
      agencyId: agency.id,
      accountId: socialAccount.id,
      accountName: userInfo.name,
    });

    // Redirect back to channels page with success message
    return NextResponse.redirect(
      new URL(`/dashboard/channels?success=LinkedIn+account+connected`, ENV.NEXTAUTH_URL)
    );
  } catch (error) {
    logError("LinkedIn OAuth callback failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL("/dashboard/channels?error=Connection+failed", ENV.NEXTAUTH_URL)
    );
  }
}
