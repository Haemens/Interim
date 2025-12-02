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
import { isDemoAgency, DemoReadOnlyError } from "@/modules/auth/demo-mode";
import { assertFeature, PlanLimitError } from "@/modules/billing/plan-features";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { regenerateSingleVariantWithAI } from "@/modules/content";
import { AiNotConfiguredError } from "@/modules/ai";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const regenerateAiContentSchema = z.object({
  tone: z.enum(["default", "friendly", "formal", "punchy"]).optional().default("default"),
  language: z.string().min(2).max(5).optional(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("AI Content Regenerate API Error", {
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

  if (error instanceof PlanLimitError) {
    return NextResponse.json(
      { error: error.message, code: "PLAN_LIMIT", feature: error.feature },
      { status: 403 }
    );
  }

  if (error instanceof AiNotConfiguredError) {
    return NextResponse.json(
      { error: error.message, code: "AI_NOT_CONFIGURED" },
      { status: 503 }
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
// POST /api/jobs/[jobId]/content/[contentId]/regenerate/ai - Regenerate single variant
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; contentId: string }> }
) {
  try {
    const { jobId, contentId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership, user } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can regenerate content
    assertMinimumRole(membership, "RECRUITER");

    // Plan gating: AI generation requires Pro+
    await assertFeature(agency.id, "aiGeneration");

    // Demo mode: In demo, we'll use template fallback instead of blocking
    const isDemo = isDemoAgency(agency);
    if (isDemo) {
      logInfo("AI regeneration in demo mode - will use template fallback", { contentId });
    }

    // Parse body
    let tone: "default" | "friendly" | "formal" | "punchy" = "default";
    let language: string | undefined;
    try {
      const body = await request.json();
      const data = regenerateAiContentSchema.parse(body);
      tone = data.tone;
      language = data.language;
    } catch {
      // Use defaults if body is empty or invalid
    }

    // Verify content exists and belongs to this job/agency
    const existingContent = await db.jobPostContent.findFirst({
      where: {
        id: contentId,
        jobId,
        agencyId: agency.id,
      },
      include: {
        job: { select: { title: true } },
      },
    });

    if (!existingContent) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Regenerate with AI
    const updated = await regenerateSingleVariantWithAI({
      jobPostContentId: contentId,
      tone,
      language,
      userId: user.id,
    });

    // Log event
    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        userId: user.id,
        jobId,
        type: "SOCIAL_CONTENT_AI_REGENERATED",
        payload: {
          contentId,
          variant: updated.variant,
          tone,
          language: language || existingContent.language,
          jobTitle: existingContent.job.title,
        },
      },
    });

    logInfo("Single variant regenerated with AI", {
      agencyId: agency.id,
      jobId,
      contentId,
      variant: updated.variant,
      tone,
    });

    return NextResponse.json({
      content: updated,
      message: `Regenerated ${updated.variant} content`,
    });
  } catch (error) {
    return handleError(error);
  }
}
