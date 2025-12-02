import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import { createCheckoutSession, getPlanDisplayName } from "@/modules/billing";
import { logError } from "@/lib/log";

// =============================================================================
// VALIDATION
// =============================================================================

const checkoutSchema = z.object({
  targetPlan: z.enum(["PRO", "AGENCY_PLUS"]),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Billing checkout error", {
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

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.issues },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// POST /api/billing/checkout - Create Stripe checkout session
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
    assertNotDemoAgency(agency, "upgrade billing plan");

    // Parse body
    const body = await request.json();
    const { targetPlan } = checkoutSchema.parse(body);

    // Build URLs
    const baseUrl = request.headers.get("origin") || process.env.NEXTAUTH_URL || "";
    const successUrl = `${baseUrl}/dashboard/billing?success=true&plan=${targetPlan}`;
    const cancelUrl = `${baseUrl}/dashboard/billing?canceled=true`;

    // Create checkout session
    const checkoutUrl = await createCheckoutSession(
      agency.id,
      targetPlan,
      successUrl,
      cancelUrl
    );

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    return handleError(error);
  }
}
