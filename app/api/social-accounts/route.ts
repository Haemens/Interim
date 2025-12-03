/**
 * Social Accounts API
 * 
 * GET /api/social-accounts - List connected social accounts
 * DELETE /api/social-accounts - Disconnect a social account
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantSlugFromRequest } from "@/lib/tenant";
import {
  getCurrentMembershipOrThrow,
  assertMinimumRole,
  UnauthorizedError,
  ForbiddenError,
  MembershipNotFoundError,
} from "@/modules/auth";
import { assertNotDemoAgency, DemoReadOnlyError } from "@/modules/auth/demo-mode";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Social Accounts API Error", {
    error: error instanceof Error ? error.message : "Unknown error",
  });

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.issues },
      { status: 400 }
    );
  }

  if (error instanceof DemoReadOnlyError) {
    return NextResponse.json(
      { error: error.message, code: "DEMO_READ_ONLY" },
      { status: 403 }
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof MembershipNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof TenantNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof TenantRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// GET /api/social-accounts - List connected accounts
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const tenantSlug = getTenantSlugFromRequest(request);
    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can view connected accounts
    assertMinimumRole(membership, "RECRUITER");

    // Fetch connected accounts
    const accounts = await db.socialAccount.findMany({
      where: {
        agencyId: agency.id,
        isActive: true,
      },
      select: {
        id: true,
        provider: true,
        accountName: true,
        accountHandle: true,
        accountType: true,
        tokenExpiresAt: true,
        lastUsedAt: true,
        lastError: true,
        createdAt: true,
        _count: {
          select: {
            channels: true,
          },
        },
      },
      orderBy: [{ provider: "asc" }, { accountName: "asc" }],
    });

    // Check token expiration status
    const accountsWithStatus = accounts.map((account) => ({
      ...account,
      isExpired: account.tokenExpiresAt ? account.tokenExpiresAt < new Date() : false,
      channelCount: account._count.channels,
    }));

    logInfo("Social accounts listed", {
      agencyId: agency.id,
      count: accounts.length,
    });

    return NextResponse.json({ accounts: accountsWithStatus });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// DELETE /api/social-accounts - Disconnect an account
// =============================================================================

const deleteSchema = z.object({
  accountId: z.string().cuid(),
});

export async function DELETE(request: NextRequest) {
  try {
    const tenantSlug = getTenantSlugFromRequest(request);
    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership, user } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and above can disconnect accounts
    assertMinimumRole(membership, "ADMIN");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "disconnect social accounts");

    // Parse body
    const body = await request.json();
    const { accountId } = deleteSchema.parse(body);

    // Find the account
    const account = await db.socialAccount.findFirst({
      where: {
        id: accountId,
        agencyId: agency.id,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await db.socialAccount.update({
      where: { id: accountId },
      data: {
        isActive: false,
        accessToken: "", // Clear tokens for security
        refreshToken: null,
      },
    });

    // Unlink any channels
    await db.channel.updateMany({
      where: { socialAccountId: accountId },
      data: { socialAccountId: null },
    });

    // Log the event
    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        userId: user.id,
        type: "SOCIAL_ACCOUNT_DISCONNECTED",
        payload: {
          provider: account.provider,
          accountId: account.id,
          accountName: account.accountName,
        },
      },
    });

    logInfo("Social account disconnected", {
      agencyId: agency.id,
      accountId,
      provider: account.provider,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
