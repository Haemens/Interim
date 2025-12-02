import { NextRequest, NextResponse } from "next/server";
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
import { createPortalSession } from "@/modules/billing";
import { logError } from "@/lib/log";

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Billing portal error", {
    error: error instanceof Error ? error.message : "Unknown error",
  });

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
// POST /api/billing/portal - Create Stripe customer portal session
// =============================================================================

export async function POST(request: NextRequest) {
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

    // RBAC: Only OWNER and ADMIN can manage billing
    assertMinimumRole(membership, "ADMIN");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "access billing portal");

    // Build return URL
    const baseUrl = request.headers.get("origin") || process.env.NEXTAUTH_URL || "";
    const returnUrl = `${baseUrl}/dashboard/billing`;

    // Create portal session
    const portalUrl = await createPortalSession(agency.id, returnUrl);

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    return handleError(error);
  }
}
