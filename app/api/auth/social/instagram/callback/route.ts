/**
 * Instagram OAuth - Callback Handler
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ENV } from "@/lib/env";
import { logInfo, logError } from "@/lib/log";

const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token";
const INSTAGRAM_ACCOUNTS_URL = "https://graph.facebook.com/v18.0/me/accounts";

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

    const callbackUrl = new URL("/api/auth/social/instagram/callback", ENV.NEXTAUTH_URL);

    // Exchange code for access token
    const tokenResponse = await fetch(
      `${FACEBOOK_TOKEN_URL}?client_id=${ENV.INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(callbackUrl.toString())}&client_secret=${ENV.INSTAGRAM_APP_SECRET}&code=${code}`
    );

    if (!tokenResponse.ok) {
      logError("Instagram token exchange failed", { status: tokenResponse.status });
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Token+exchange+failed", ENV.NEXTAUTH_URL)
      );
    }

    const tokenData = await tokenResponse.json();

    // Get Instagram Business Account via Facebook Pages
    const pagesResponse = await fetch(
      `${INSTAGRAM_ACCOUNTS_URL}?access_token=${tokenData.access_token}&fields=id,name,instagram_business_account`
    );

    if (!pagesResponse.ok) {
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=Failed+to+get+pages", ENV.NEXTAUTH_URL)
      );
    }

    const pagesData = await pagesResponse.json();
    const pageWithInstagram = pagesData.data?.find((p: any) => p.instagram_business_account);

    if (!pageWithInstagram) {
      return NextResponse.redirect(
        new URL("/dashboard/channels?error=No+Instagram+Business+account+found", ENV.NEXTAUTH_URL)
      );
    }

    const instagramAccountId = pageWithInstagram.instagram_business_account.id;

    // Store the account
    const socialAccount = await db.socialAccount.upsert({
      where: {
        agencyId_provider_providerAccountId: {
          agencyId: agency.id,
          provider: "INSTAGRAM",
          providerAccountId: instagramAccountId,
        },
      },
      update: {
        accountName: pageWithInstagram.name,
        accessToken: tokenData.access_token,
        tokenExpiresAt: tokenData.expires_in 
          ? new Date(Date.now() + tokenData.expires_in * 1000) 
          : null,
        isActive: true,
        lastError: null,
      },
      create: {
        agencyId: agency.id,
        provider: "INSTAGRAM",
        providerAccountId: instagramAccountId,
        accountName: pageWithInstagram.name,
        accountType: "business",
        accessToken: tokenData.access_token,
        tokenExpiresAt: tokenData.expires_in 
          ? new Date(Date.now() + tokenData.expires_in * 1000) 
          : null,
        isActive: true,
      },
    });

    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        userId: stateData.userId,
        type: "SOCIAL_ACCOUNT_CONNECTED",
        payload: { provider: "INSTAGRAM", accountId: socialAccount.id },
      },
    });

    logInfo("Instagram account connected", { agencyId: agency.id, accountId: socialAccount.id });

    return NextResponse.redirect(
      new URL("/dashboard/channels?success=Instagram+connected", ENV.NEXTAUTH_URL)
    );
  } catch (error) {
    logError("Instagram OAuth callback failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      new URL("/dashboard/channels?error=Connection+failed", ENV.NEXTAUTH_URL)
    );
  }
}
