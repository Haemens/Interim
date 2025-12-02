import { NextRequest, NextResponse } from "next/server";
import { getTenantSlugFromRequest } from "@/lib/tenant";
import {
  getCurrentMembershipOrThrow,
  assertMinimumRole,
  UnauthorizedError,
  ForbiddenError,
  MembershipNotFoundError,
} from "@/modules/auth";
import { isDemoAgency, DemoReadOnlyError } from "@/modules/auth/demo-mode";
import { assertFeature, PlanLimitError } from "@/modules/billing/plan-features";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { executePublish, PublishError, MAX_PUBLISH_ATTEMPTS } from "@/modules/social";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Publication Publish API Error", {
    error: error instanceof Error ? error.message : "Unknown error",
    code: error instanceof PublishError ? error.code : undefined,
  });

  if (error instanceof PublishError) {
    const statusMap: Record<string, number> = {
      PUBLICATION_NOT_FOUND: 404,
      PUBLISHING_IN_PROGRESS: 409,
      MAX_ATTEMPTS_REACHED: 400,
      NO_PROVIDER: 400,
      PROVIDER_ERROR: 502,
    };
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: statusMap[error.code] || 500 }
    );
  }

  if (error instanceof DemoReadOnlyError) {
    return NextResponse.json(
      { error: error.message, code: "DEMO_READ_ONLY" },
      { status: 403 }
    );
  }

  if (error instanceof PlanLimitError) {
    return NextResponse.json(
      { error: error.message, code: "PLAN_LIMIT", feature: error.feature },
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
// POST /api/publications/[id]/publish - Publish content to social platform
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: publicationId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership, user } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can publish
    assertMinimumRole(membership, "RECRUITER");

    // Plan gating: Auto-publish requires Pro+
    await assertFeature(agency.id, "autoPublish");

    // Check if demo mode
    const isDemo = isDemoAgency(agency);

    logInfo("[Publish API] Request received", {
      publicationId,
      agencyId: agency.id,
      userId: user.id,
      isDemo,
    });

    // Execute the publish flow using shared logic
    const outcome = await executePublish({
      publicationId,
      agencyId: agency.id,
      agencySlug: agency.slug,
      userId: user.id,
    });

    // Return appropriate response
    if (outcome.success) {
      return NextResponse.json({
        success: true,
        publication: {
          id: outcome.publication.id,
          status: outcome.publication.status,
          publishedAt: outcome.publication.publishedAt?.toISOString(),
          externalUrl: outcome.publication.externalUrl,
          externalId: outcome.publication.externalId,
        },
        isStub: outcome.providerResult?.isStub,
        message: isDemo
          ? "Publication simulated (demo mode)"
          : "Content published successfully",
      });
    } else {
      return NextResponse.json({
        success: false,
        publication: {
          id: outcome.publication.id,
          status: outcome.publication.status,
          errorMessage: outcome.publication.errorMessage,
        },
        message: outcome.publication.errorMessage || "Failed to publish content",
      });
    }
  } catch (error) {
    return handleError(error);
  }
}
