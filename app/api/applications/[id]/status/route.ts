import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import {
  getCurrentUser,
  getCurrentMembershipOrThrow,
  assertMinimumRole,
  UnauthorizedError,
  ForbiddenError,
  MembershipNotFoundError,
} from "@/modules/auth";
import { assertNotDemoAgency, DemoReadOnlyError } from "@/modules/auth/demo-mode";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { logInfo, logError, logEvent } from "@/lib/log";
import { createMissionFromApplication } from "@/modules/mission/lifecycle";
import { logActivityEvent } from "@/modules/activity";

// =============================================================================
// VALIDATION
// =============================================================================

const statusUpdateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PLACED", "REJECTED"]),
  note: z.string().max(5000).optional(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Application status update error", {
    error: error instanceof Error ? error.message : "Unknown error",
  });

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.issues },
      { status: 400 }
    );
  }
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  if (error instanceof MembershipNotFoundError) {
    return NextResponse.json({ error: "Not a member of this agency" }, { status: 403 });
  }
  if (error instanceof TenantNotFoundError) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }
  if (error instanceof TenantRequiredError) {
    return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
  }
  if (error instanceof DemoReadOnlyError) {
    return NextResponse.json({ error: error.message, code: "DEMO_READ_ONLY" }, { status: 403 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// PATCH /api/applications/[id]/status - Update application status
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params;
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get membership and verify RECRUITER+ role
    const context = await getCurrentMembershipOrThrow(tenantSlug);
    assertMinimumRole(context.membership, "RECRUITER");

    // Demo mode: allow updates for testing
    // assertNotDemoAgency(context.agency, "update application status");

    const agencyId = context.agency.id;
    const userId = context.user.id;

    // Parse and validate body
    const body = await request.json();
    const data = statusUpdateSchema.parse(body);

    // Find application and verify it belongs to this agency
    const application = await db.application.findFirst({
      where: {
        id: applicationId,
        agencyId,
      },
      select: {
        id: true,
        status: true,
        note: true,
        jobId: true,
        fullName: true,
        candidateId: true,
        agencyId: true,
        job: {
          select: { clientId: true }
        }
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const previousStatus = application.status;
    const newStatus = data.status;

    // Build note update - append with timestamp if provided
    let updatedNote = application.note || "";
    if (data.note) {
      const timestamp = new Date().toISOString();
      const noteEntry = `[${timestamp}] Status: ${previousStatus} → ${newStatus}\n${data.note}`;
      updatedNote = updatedNote ? `${updatedNote}\n\n${noteEntry}` : noteEntry;
    }

    // Update application
    const updated = await db.application.update({
      where: { id: applicationId },
      data: {
        status: newStatus,
        note: updatedNote || application.note,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        note: true,
        updatedAt: true,
        fullName: true,
      },
    });

    // Auto-create mission if placed
    if (newStatus === "PLACED" && previousStatus !== "PLACED") {
      if (application.candidateId && application.job?.clientId) {
        try {
          await createMissionFromApplication(application.id, {
            jobId: application.jobId,
            candidateId: application.candidateId,
            clientId: application.job.clientId,
            agencyId: application.agencyId,
            startDate: new Date(), // Default start today
            endDatePlanned: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 1 week duration
            createdById: userId,
          });
          logInfo("Auto-created mission for placed application", { applicationId });
        } catch (err) {
          logError("Failed to auto-create mission", { error: err instanceof Error ? err.message : "Unknown" });
        }
      }
    }

    // Log event
    logEvent({
      type: "APPLICATION_STATUS_CHANGED",
      agencyId,
      userId,
      payload: {
        applicationId,
        jobId: application.jobId,
        candidateName: application.fullName,
        previousStatus,
        newStatus,
      },
    });

    // Log activity timeline
    await logActivityEvent({
      agencyId,
      actorUserId: userId,
      targetType: "APPLICATION",
      targetId: applicationId,
      action: "STATUS_CHANGED",
      summary: `${context.user.name || "User"} moved ${application.fullName} to ${newStatus}`,
      metadata: { previousStatus, newStatus, candidateName: application.fullName }
    });

    if (application.candidateId) {
      await logActivityEvent({
        agencyId,
        actorUserId: userId,
        targetType: "CANDIDATE",
        targetId: application.candidateId,
        action: "CANDIDATE_MOVED_STAGE",
        summary: `${context.user.name || "User"} moved ${application.fullName} to ${newStatus}`,
        metadata: { jobId: application.jobId, applicationId, newStatus }
      });
    }

    logInfo("Application status updated", {
      applicationId,
      previousStatus,
      newStatus,
      userId,
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      note: updated.note,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleError(error);
  }
}
