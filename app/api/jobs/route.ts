import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import {
  getCurrentMembershipOrThrow,
  getCurrentUser,
  assertMinimumRole,
  UnauthorizedError,
  ForbiddenError,
  MembershipNotFoundError,
} from "@/modules/auth";
import { assertNotDemoAgency, isDemoAgency } from "@/modules/auth/demo-mode";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import {
  assertCanCreateActiveJob,
  JobLimitError,
  getPlanDisplayName,
} from "@/modules/billing";
import { logInfo, logError, logWarn, logEvent } from "@/lib/log";
import { sendTemplatedEmail } from "@/lib/email";
import { getTenantUrl } from "@/lib/tenant";
import type { Agency, Job } from "@prisma/client";

// =============================================================================
// HELPERS
// =============================================================================

const MAX_CANDIDATES_TO_NOTIFY = 50;

/**
 * Notify matching candidates about a new job
 * Best-effort: failures are logged but don't affect job creation
 */
async function notifyMatchingCandidates(agency: Agency, job: Job): Promise<void> {
  try {
    // Build match criteria based on job sector and tags
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orConditions: any[] = [];

    if (job.sector) {
      orConditions.push({ sectors: { has: job.sector } });
    }

    if (job.tags && job.tags.length > 0) {
      // Match candidates who have any of the job's tags in their skills
      for (const tag of job.tags) {
        orConditions.push({ skills: { has: tag } });
      }
    }

    // If no match criteria, skip notification
    if (orConditions.length === 0) {
      logInfo("No match criteria for job, skipping candidate notification", {
        jobId: job.id,
      });
      return;
    }

    // Find matching candidates
    const matchingCandidates = await db.candidateProfile.findMany({
      where: {
        agencyId: agency.id,
        status: "ACTIVE",
        consentToContact: true,
        OR: orConditions,
      },
      take: MAX_CANDIDATES_TO_NOTIFY,
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    if (matchingCandidates.length === 0) {
      logInfo("No matching candidates found for job", { jobId: job.id });
      return;
    }

    logInfo("Notifying matching candidates", {
      jobId: job.id,
      count: matchingCandidates.length,
    });

    // Build job URL
    const jobUrl = getTenantUrl(agency.slug, `/jobs/${job.id}`);

    // Send emails (fire and forget for each)
    const emailPromises = matchingCandidates.map((candidate) =>
      sendTemplatedEmail(candidate.email, "matching_job_candidate", {
        candidateName: candidate.fullName,
        jobTitle: job.title,
        agencyName: agency.name,
        jobUrl,
        location: job.location || undefined,
      }).catch((err: Error) => {
        logWarn("Failed to send matching job email", {
          candidateId: candidate.id,
          error: err.message,
        });
      })
    );

    await Promise.all(emailPromises);

    // Log event
    await logEvent({
      type: "APPLICATION_CREATED", // Using existing type, could add MATCHING_CANDIDATES_NOTIFIED
      agencyId: agency.id,
      jobId: job.id,
      payload: {
        action: "matching_candidates_notified",
        count: matchingCandidates.length,
      },
    });

    logInfo("Matching candidates notified successfully", {
      jobId: job.id,
      count: matchingCandidates.length,
    });
  } catch (error) {
    logError("Error notifying matching candidates", {
      jobId: job.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Don't rethrow - this is best-effort
  }
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createJobSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  location: z.string().max(200).optional(),
  contractType: z.string().max(50).optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  currency: z.string().max(3).default("EUR"),
  sector: z.string().max(100).optional(),
  description: z.string().min(1, "Description is required"),
  profile: z.string().optional(),
  benefits: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).default("DRAFT"),
  notifyCandidates: z.boolean().optional().default(false),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Jobs API Error", {
    error: error instanceof Error ? error.message : "Unknown error",
  });

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.issues },
      { status: 400 }
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

  if (error instanceof JobLimitError) {
    return NextResponse.json(
      {
        error: error.message,
        code: "JOB_LIMIT_REACHED",
        currentCount: error.currentCount,
        maxAllowed: error.maxAllowed,
        currentPlan: error.currentPlan,
        planDisplayName: getPlanDisplayName(error.currentPlan),
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// GET /api/jobs - List jobs for current agency with search & filters
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context (validates user belongs to this agency)
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can list jobs
    assertMinimumRole(membership, "RECRUITER");

    // Parse query params
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status"); // single or comma-separated
    const q = searchParams.get("q"); // search query
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Parse status filter (supports comma-separated values)
    const statusValues = statusParam
      ? statusParam.split(",").filter(Boolean) as Array<"DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED">
      : undefined;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      agencyId: agency.id,
    };

    // Status filter
    if (statusValues && statusValues.length > 0) {
      if (statusValues.length === 1) {
        where.status = statusValues[0];
      } else {
        where.status = { in: statusValues };
      }
    }

    // Search filter (title, location, sector, tags)
    if (q && q.trim()) {
      const searchTerm = q.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { location: { contains: searchTerm, mode: "insensitive" } },
        { sector: { contains: searchTerm, mode: "insensitive" } },
        { tags: { has: searchTerm } },
      ];
    }

    // Fetch jobs
    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { applications: true },
          },
        },
      }),
      db.job.count({ where }),
    ]);

    return NextResponse.json({
      jobs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + jobs.length < total,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// POST /api/jobs - Create a new job
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, currentUser?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership, user } =
      await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and OWNER can create jobs
    assertMinimumRole(membership, "ADMIN");

    // Parse and validate body
    const body = await request.json();
    const data = createJobSchema.parse(body);

    // Demo mode: return simulated response
    if (isDemoAgency(agency)) {
      const demoJob = {
        id: `demo-job-${Date.now()}`,
        agencyId: agency.id,
        title: data.title,
        location: data.location || null,
        contractType: data.contractType || null,
        salaryMin: data.salaryMin || null,
        salaryMax: data.salaryMax || null,
        currency: data.currency,
        sector: data.sector || null,
        description: data.description,
        profile: data.profile || null,
        benefits: data.benefits || null,
        tags: data.tags,
        status: data.status,
        publishedAt: data.status === "ACTIVE" ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        job: demoJob,
        isDemo: true,
        message: "Offre créée en mode démo (simulation)",
      }, { status: 201 });
    }

    // Plan check: if creating an ACTIVE job, check limit
    if (data.status === "ACTIVE") {
      await assertCanCreateActiveJob(agency.id);
    }

    logInfo("Creating job", { agencyId: agency.id, title: data.title });

    // Create job
    const job = await db.job.create({
      data: {
        agencyId: agency.id,
        title: data.title,
        location: data.location,
        contractType: data.contractType,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        currency: data.currency,
        sector: data.sector,
        description: data.description,
        profile: data.profile,
        benefits: data.benefits,
        tags: data.tags,
        status: data.status,
        publishedAt: data.status === "ACTIVE" ? new Date() : null,
      },
    });

    // Log event
    await logEvent({
      type: "JOB_CREATED",
      agencyId: agency.id,
      userId: user.id,
      jobId: job.id,
      payload: { title: job.title, status: job.status },
    });

    logInfo("Job created successfully", { jobId: job.id, title: job.title });

    // Notify matching candidates if job is ACTIVE and notifyCandidates is true
    if (job.status === "ACTIVE" && data.notifyCandidates) {
      notifyMatchingCandidates(agency, job).catch((err) => {
        logWarn("Failed to notify matching candidates", {
          jobId: job.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      });
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
