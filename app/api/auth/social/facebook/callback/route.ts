/**
 * Facebook OAuth - Callback Handler
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ENV } from "@/lib/env";
import { logInfo, logError } from "@/lib/log";

const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token";
const FACEBOOK_PAGES_URL = "https://graph.facebook.com/v18.0/me/accounts";

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

    let stateData: { tenantSlug: string; userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString());
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

    const callbackUrl = new URL("/api/auth/social/facebook/callback", ENV.NEXTAUTH_URL);

    // Exchange code for access token
    const tokenResponse = await fetch(
      `${FACEBOOK_TOKEN_URL}?client_id=${ENV.INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(callbackUrl.toString())}&client_secret=${ENV.INSTAGRAM_APP_SECRET}&code=${code}`
    );

    if (!tokenResponse.ok) {
      logError("Facebook token exchange failed", { status: tokenResponse.status });
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Token+exchange+failed", ENV.NEXTAUTH_URL)
      );
    }

    const tokenData = await tokenResponse.json();

    // Get Facebook Pages
    const pagesResponse = await fetch(
      `${FACEBOOK_PAGES_URL}?access_token=${tokenData.access_token}&fields=id,name,access_token`
    );

    if (!pagesResponse.ok) {
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Failed+to+get+pages", ENV.NEXTAUTH_URL)
      );
    }

    const pagesData = await pagesResponse.json();
    const firstPage = pagesData.data?.[0];

    if (!firstPage) {
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=No+Facebook+Page+found", ENV.NEXTAUTH_URL)
      );
    }

    // Store the account (using page access token for posting)
    const socialAccount = await db.socialAccount.upsert({
      where: {
        agencyId_provider_providerAccountId: {
          agencyId: agency.id,
          provider: "FACEBOOK",
          providerAccountId: firstPage.id,
        },
      },
      update: {
        accountName: firstPage.name,
        accessToken: firstPage.access_token, // Page access token
        isActive: true,
        lastError: null,
      },
      create: {
        agencyId: agency.id,
        provider: "FACEBOOK",
        providerAccountId: firstPage.id,
        accountName: firstPage.name,
        accountType: "page",
        accessToken: firstPage.access_token,
        isActive: true,
      },
    });

    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        userId: stateData.userId,
        type: "SOCIAL_ACCOUNT_CONNECTED",
        payload: { provider: "FACEBOOK", accountId: socialAccount.id },
      },
    });

    logInfo("Facebook account connected", { agencyId: agency.id, accountId: socialAccount.id });

    return NextResponse.redirect(
      new URL("/dashboard/channels?success=Facebook+connected", ENV.NEXTAUTH_URL)
    );
  } catch (error) {
    logError("Facebook OAuth callback failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL("/dashboard/channels?error=Connection+failed", ENV.NEXTAUTH_URL)
    );
  }
}
