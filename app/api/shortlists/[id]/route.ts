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
import { assertFeature, PlanLimitError, getPlanDisplayName } from "@/modules/billing";
import { getShortlistDetailWithCandidates } from "@/modules/shortlist";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateShortlistSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  note: z.string().max(2000).optional().nullable(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Shortlist Detail API Error", {
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

  if (error instanceof PlanLimitError) {
    return NextResponse.json(
      {
        error: error.message,
        code: "PLAN_LIMIT",
        currentPlan: error.currentPlan,
        requiredPlan: error.requiredPlan,
        planDisplayName: getPlanDisplayName(error.currentPlan),
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// GET /api/shortlists/[id] - Get shortlist detail with candidates
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can view shortlists
    assertMinimumRole(membership, "RECRUITER");

    // Plan check: ensure shortlists feature is available
    await assertFeature(agency.id, "shortlists");

    logInfo("Fetching shortlist detail", { agencyId: agency.id, shortlistId: id });

    // Get detailed shortlist
    const shortlist = await getShortlistDetailWithCandidates(agency.id, id);

    if (!shortlist) {
      return NextResponse.json(
        { error: "Shortlist not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ shortlist });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// PATCH /api/shortlists/[id] - Update shortlist metadata
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can update shortlists
    assertMinimumRole(membership, "RECRUITER");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "update shortlists");

    // Plan check
    await assertFeature(agency.id, "shortlists");

    // Parse and validate body
    const body = await request.json();
    const data = updateShortlistSchema.parse(body);

    // Verify shortlist exists and belongs to agency
    const existing = await db.shortlist.findFirst({
      where: { id, agencyId: agency.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Shortlist not found" },
        { status: 404 }
      );
    }

    logInfo("Updating shortlist", { agencyId: agency.id, shortlistId: id, updates: data });

    // Update shortlist
    const updated = await db.shortlist.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.note !== undefined && { note: data.note }),
      },
      include: {
        job: { select: { id: true, title: true } },
        client: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    return NextResponse.json({
      shortlist: {
        id: updated.id,
        name: updated.name,
        note: updated.note,
        shareToken: updated.shareToken,
        shareUrl: `${baseUrl}/shortlist/${updated.shareToken}`,
        job: updated.job,
        client: updated.client,
        candidatesCount: updated._count.items,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
