import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantSlugFromRequest } from "@/lib/tenant";
import {
  getCurrentMembershipOrThrow,
  assertMinimumRole,
  UnauthorizedError,
  ForbiddenError,
  MembershipNotFoundError,
} from "@/modules/auth";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Job Shortlists API Error", {
    error: error instanceof Error ? error.message : "Unknown error",
  });

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
// GET /api/jobs/[jobId]/shortlists - List shortlists for a specific job
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

    // RBAC: RECRUITER and above can list shortlists
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

    logInfo("Fetching shortlists for job", { agencyId: agency.id, jobId });

    // Fetch shortlists for this job
    const shortlists = await db.shortlist.findMany({
      where: {
        agencyId: agency.id,
        jobId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { id: true, name: true },
        },
        items: {
          select: { id: true },
        },
        feedback: {
          select: { decision: true },
        },
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const result = shortlists.map((sl) => {
      const approved = sl.feedback.filter((f) => f.decision === "APPROVED").length;
      const rejected = sl.feedback.filter((f) => f.decision === "REJECTED").length;
      const pending = sl.items.length - approved - rejected;

      return {
        id: sl.id,
        name: sl.name,
        shareToken: sl.shareToken,
        shareUrl: `${baseUrl}/shortlist/${sl.shareToken}`,
        note: sl.note,
        createdAt: sl.createdAt.toISOString(),
        client: sl.client,
        candidatesCount: sl.items.length,
        feedback: {
          approved,
          rejected,
          pending: Math.max(0, pending),
        },
      };
    });

    return NextResponse.json({ shortlists: result });
  } catch (error) {
    return handleError(error);
  }
}
