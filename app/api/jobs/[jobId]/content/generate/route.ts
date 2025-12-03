import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantSlugFromRequest, getTenantSlugWithFallback } from "@/lib/tenant";
import { authOptions } from "@/lib/auth";
import {
  getCurrentMembershipOrThrow,
  assertMinimumRole,
  UnauthorizedError,
  ForbiddenError,
  MembershipNotFoundError,
} from "@/modules/auth";
import { assertNotDemoAgency, DemoReadOnlyError } from "@/modules/auth/demo-mode";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { generateSocialPackForJob } from "@/modules/content";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const generateContentSchema = z.object({
  language: z.string().min(2).max(5).optional().default("fr"),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Content Generate API Error", {
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
// POST /api/jobs/[jobId]/content/generate - Generate social content pack
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    
    // Try to get tenant slug with fallback for dev/demo environments
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    const tenantSlug = await getTenantSlugWithFallback(request, userId);

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

    // Demo mode: allow generation for testing purposes (uncomment to block in production if needed)
    // assertNotDemoAgency(agency, "generate social content");

    // Parse body (optional language)
    let language = "fr";
    try {
      const body = await request.json();
      const data = generateContentSchema.parse(body);
      language = data.language;
    } catch {
      // Use default language if body is empty or invalid
    }

    // Load job
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        agencyId: agency.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Generate content pack
    const generatedVariants = await generateSocialPackForJob({
      job: {
        id: job.id,
        title: job.title,
        location: job.location,
        contractType: job.contractType,
        sector: job.sector,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        description: job.description,
        profile: job.profile,
        benefits: job.benefits,
        tags: job.tags,
      },
      agency: {
        id: agency.id,
        name: agency.name,
        slug: agency.slug,
      },
      language,
    });

    // Create JobPostContent entries for each variant
    const createdContents = await Promise.all(
      generatedVariants.map((variant) =>
        db.jobPostContent.create({
          data: {
            jobId: job.id,
            agencyId: agency.id,
            variant: variant.variant,
            title: variant.title || null,
            body: variant.body,
            suggestedHashtags: variant.suggestedHashtags || null,
            language,
            status: "DRAFT",
            createdById: user.id,
            generatedAt: new Date(),
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })
      )
    );

    // Log event
    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        userId: user.id,
        jobId: job.id,
        type: "SOCIAL_CONTENT_GENERATED",
        payload: {
          jobTitle: job.title,
          language,
          variantCount: createdContents.length,
          variants: createdContents.map((c: { variant: string }) => c.variant),
        },
      },
    });

    logInfo("Social content pack generated", {
      agencyId: agency.id,
      jobId,
      language,
      variantCount: createdContents.length,
    });

    return NextResponse.json(
      {
        contents: createdContents,
        message: `Generated ${createdContents.length} content variants`,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
