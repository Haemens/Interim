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
import {
  canCreateActiveJob,
  JobLimitError,
  getPlanDisplayName,
} from "@/modules/billing";
import { logInfo, logError, logEvent } from "@/lib/log";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateJobSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).optional(),
  location: z.string().max(200).optional().nullable(),
  contractType: z.string().max(50).optional().nullable(),
  salaryMin: z.number().int().positive().optional().nullable(),
  salaryMax: z.number().int().positive().optional().nullable(),
  currency: z.string().max(3).optional(),
  sector: z.string().max(100).optional().nullable(),
  description: z.string().min(1, "Description is required").optional(),
  profile: z.string().optional().nullable(),
  benefits: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
  clientId: z.string().cuid().optional().nullable(),
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

  if (error instanceof DemoReadOnlyError) {
    return NextResponse.json(
      {
        error: error.message,
        code: "DEMO_READ_ONLY",
      },
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
// GET /api/jobs/[jobId] - Get a single job
// =============================================================================

export async function GET(
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
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: VIEWER and above can view jobs
    assertMinimumRole(membership, "VIEWER");

    // Find job - ensure it belongs to this agency
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        agencyId: agency.id,
      },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// PATCH /api/jobs/[jobId] - Update a job
// =============================================================================

export async function PATCH(
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
    const { agency, membership, user } =
      await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and above can edit jobs
    assertMinimumRole(membership, "ADMIN");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "edit jobs");

    // Find existing job - ensure it belongs to this agency
    const existingJob = await db.job.findFirst({
      where: {
        id: jobId,
        agencyId: agency.id,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Parse and validate body
    const body = await request.json();
    const data = updateJobSchema.parse(body);

    // If changing status to ACTIVE, check plan limits
    // But only if the job wasn't already ACTIVE (don't double-count)
    if (data.status === "ACTIVE" && existingJob.status !== "ACTIVE") {
      const { allowed, currentCount, maxAllowed, plan } = await canCreateActiveJob(agency.id);
      if (!allowed && maxAllowed !== null) {
        throw new JobLimitError(currentCount, maxAllowed, plan);
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.contractType !== undefined) updateData.contractType = data.contractType;
    if (data.salaryMin !== undefined) updateData.salaryMin = data.salaryMin;
    if (data.salaryMax !== undefined) updateData.salaryMax = data.salaryMax;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.sector !== undefined) updateData.sector = data.sector;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.profile !== undefined) updateData.profile = data.profile;
    if (data.benefits !== undefined) updateData.benefits = data.benefits;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.status !== undefined) {
      updateData.status = data.status;
      // Set publishedAt when first publishing
      if (data.status === "ACTIVE" && !existingJob.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }
    if (data.clientId !== undefined) updateData.clientId = data.clientId;

    logInfo("Updating job", {
      jobId,
      agencyId: agency.id,
      updates: Object.keys(updateData),
    });

    // Update job
    const job = await db.job.update({
      where: { id: jobId },
      data: updateData,
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    // Log event with changed fields
    const changedFields = Object.keys(data).filter(
      (key) => data[key as keyof typeof data] !== undefined
    );

    await logEvent({
      type: "JOB_UPDATED",
      agencyId: agency.id,
      userId: user.id,
      jobId: job.id,
      payload: {
        title: job.title,
        changedFields,
        previousStatus: existingJob.status,
        newStatus: job.status,
      },
    });

    logInfo("Job updated successfully", { jobId: job.id, title: job.title });

    return NextResponse.json({ job });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// DELETE /api/jobs/[jobId] - Archive a job (soft delete)
// =============================================================================

export async function DELETE(
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
    const { agency, membership, user } =
      await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and above can delete/archive jobs
    assertMinimumRole(membership, "ADMIN");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "delete jobs");

    // Find existing job - ensure it belongs to this agency
    const existingJob = await db.job.findFirst({
      where: {
        id: jobId,
        agencyId: agency.id,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Soft delete by archiving
    const job = await db.job.update({
      where: { id: jobId },
      data: { status: "ARCHIVED" },
    });

    // Log event
    await logEvent({
      type: "JOB_ARCHIVED",
      agencyId: agency.id,
      userId: user.id,
      jobId: job.id,
      payload: {
        title: job.title,
        previousStatus: existingJob.status,
      },
    });

    logInfo("Job archived", { jobId: job.id, title: job.title });

    return NextResponse.json({
      message: "Job archived successfully",
      job: { id: job.id, status: job.status },
    });
  } catch (error) {
    return handleError(error);
  }
}
