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
// VALIDATION SCHEMAS
// =============================================================================

const contentStatusEnum = z.enum(["DRAFT", "APPROVED", "ARCHIVED"]);

const updateContentSchema = z.object({
  id: z.string().cuid(),
  title: z.string().max(200).optional().nullable(),
  body: z.string().max(10000).optional(),
  suggestedHashtags: z.string().max(1000).optional().nullable(),
  status: contentStatusEnum.optional(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Job Content API Error", {
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
// GET /api/jobs/[jobId]/content - List content for a job
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

    // RBAC: RECRUITER and above can view content
    assertMinimumRole(membership, "RECRUITER");

    // Verify job exists and belongs to agency
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        agencyId: agency.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch content with edit audit info
    const contents = await db.jobPostContent.findMany({
      where: {
        jobId,
        agencyId: agency.id,
      },
      orderBy: [{ variant: "asc" }, { createdAt: "desc" }],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lastEditedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            publications: true,
          },
        },
      },
    });

    logInfo("Job content listed", {
      agencyId: agency.id,
      jobId,
      count: contents.length,
    });

    return NextResponse.json({ contents });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// PATCH /api/jobs/[jobId]/content - Update content with approval workflow
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
    const { agency, membership, user } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can update content
    assertMinimumRole(membership, "RECRUITER");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "update content");

    // Verify job exists and belongs to agency
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        agencyId: agency.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Parse and validate body
    const body = await request.json();
    const data = updateContentSchema.parse(body);

    // Find content
    const existingContent = await db.jobPostContent.findFirst({
      where: {
        id: data.id,
        jobId,
        agencyId: agency.id,
      },
    });

    if (!existingContent) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Validate status transitions
    if (data.status !== undefined && data.status !== existingContent.status) {
      const currentStatus = existingContent.status;
      const newStatus = data.status;

      // Define allowed transitions
      // DRAFT -> APPROVED, ARCHIVED
      // APPROVED -> ARCHIVED, DRAFT (for re-editing)
      // ARCHIVED -> DRAFT (un-archive for re-use)
      const allowedTransitions: Record<string, string[]> = {
        DRAFT: ["APPROVED", "ARCHIVED"],
        APPROVED: ["ARCHIVED", "DRAFT"],
        ARCHIVED: ["DRAFT"],
      };

      if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${currentStatus} to ${newStatus}`,
            code: "INVALID_STATUS_TRANSITION",
          },
          { status: 400 }
        );
      }
    }

    // Build update data with edit audit trail
    const updateData: {
      title?: string | null;
      body?: string;
      suggestedHashtags?: string | null;
      status?: "DRAFT" | "APPROVED" | "ARCHIVED";
      approvedAt?: Date | null;
      lastEditedById: string;
      lastEditedAt: Date;
    } = {
      // Always track who edited and when
      lastEditedById: user.id,
      lastEditedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.suggestedHashtags !== undefined) updateData.suggestedHashtags = data.suggestedHashtags;
    if (data.status !== undefined) {
      updateData.status = data.status;
      // Set approvedAt when status changes to APPROVED
      if (data.status === "APPROVED" && existingContent.status !== "APPROVED") {
        updateData.approvedAt = new Date();
      }
      // Clear approvedAt if moving back to DRAFT
      if (data.status === "DRAFT" && existingContent.status === "APPROVED") {
        updateData.approvedAt = null;
      }
    }

    // Update content
    const content = await db.jobPostContent.update({
      where: { id: data.id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lastEditedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            publications: true,
          },
        },
      },
    });

    // Log event for status changes
    if (data.status !== undefined && data.status !== existingContent.status) {
      await db.eventLog.create({
        data: {
          agencyId: agency.id,
          userId: user.id,
          jobId,
          type: "CONTENT_STATUS_CHANGED",
          payload: {
            contentId: content.id,
            variant: content.variant,
            previousStatus: existingContent.status,
            newStatus: data.status,
          },
        },
      });
    }

    logInfo("Job content updated", {
      agencyId: agency.id,
      jobId,
      contentId: content.id,
      statusChange: data.status !== existingContent.status ? `${existingContent.status} -> ${data.status}` : null,
    });

    return NextResponse.json({ content });
  } catch (error) {
    return handleError(error);
  }
}
