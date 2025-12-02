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
import { assertNotDemoAgency, isDemoAgency, DemoReadOnlyError } from "@/modules/auth/demo-mode";
import { assertFeature, PlanLimitError } from "@/modules/billing/plan-features";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { generateJobContentPackWithAI } from "@/modules/content";
import { AiNotConfiguredError } from "@/modules/ai";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const generateAiContentSchema = z.object({
  tone: z.enum(["default", "friendly", "formal", "punchy"]).optional().default("default"),
  language: z.string().min(2).max(5).optional().default("fr"),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("AI Content Generate API Error", {
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
// POST /api/jobs/[jobId]/content/generate/ai - Generate content pack with AI
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership, user } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can generate content
    assertMinimumRole(membership, "RECRUITER");

    // Plan gating: AI generation requires Pro+
    await assertFeature(agency.id, "aiGeneration");

    // Demo mode: In demo, we'll use template fallback instead of blocking
    const isDemo = isDemoAgency(agency);
    if (isDemo) {
      logInfo("AI generation in demo mode - will use template fallback", { jobId });
    }

    // Parse body
    let tone: "default" | "friendly" | "formal" | "punchy" = "default";
    let language = "fr";
    try {
      const body = await request.json();
      const data = generateAiContentSchema.parse(body);
      tone = data.tone;
      language = data.language;
    } catch {
      // Use defaults if body is empty or invalid
    }

    // Load job to verify it exists
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        agencyId: agency.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Generate content pack with AI
    const result = await generateJobContentPackWithAI({
      jobId,
      agencyId: agency.id,
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
        type: "SOCIAL_CONTENT_AI_GENERATED",
        payload: {
          jobTitle: job.title,
          tone,
          language,
          variantCount: result.contents.length,
          usedAi: result.usedAi,
          variants: result.contents.map((c) => c.variant),
        },
      },
    });

    logInfo("AI content pack generated", {
      agencyId: agency.id,
      jobId,
      tone,
      language,
      variantCount: result.contents.length,
      usedAi: result.usedAi,
    });

    return NextResponse.json(
      {
        contents: result.contents,
        usedAi: result.usedAi,
        message: result.usedAi
          ? `Generated ${result.contents.length} content variants with AI`
          : `Generated ${result.contents.length} content variants (AI not configured, used templates)`,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
