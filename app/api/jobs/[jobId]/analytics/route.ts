import { NextRequest, NextResponse } from "next/server";
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
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Job Analytics API Error", {
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
// GET /api/jobs/[jobId]/analytics - Get analytics for a specific job
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can view job analytics
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

    logInfo("Fetching job analytics", { agencyId: agency.id, jobId });

    // Calculate date for "last 7 days" filter
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch analytics data in parallel
    const [
      totalApplications,
      recentApplications,
      applicationsByStatus,
      applicationsBySource,
      applicationsWithChannel,
      shortlists,
    ] = await Promise.all([
      // Total applications for this job
      db.application.count({
        where: {
          jobId,
          agencyId: agency.id,
        },
      }),

      // Applications in last 7 days
      db.application.count({
        where: {
          jobId,
          agencyId: agency.id,
          createdAt: { gte: sevenDaysAgo },
        },
      }),

      // Applications by status
      db.application.groupBy({
        by: ["status"],
        where: {
          jobId,
          agencyId: agency.id,
        },
        _count: { id: true },
      }),

      // Applications by source
      db.application.groupBy({
        by: ["source"],
        where: {
          jobId,
          agencyId: agency.id,
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // Applications with channel info
      db.application.findMany({
        where: {
          jobId,
          agencyId: agency.id,
          sourceChannelId: { not: null },
        },
        select: {
          sourceChannelId: true,
          sourceChannel: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      }),

      // Shortlists for this job with feedback
      db.shortlist.findMany({
        where: {
          jobId,
          agencyId: agency.id,
        },
        include: {
          items: {
            select: { id: true },
          },
          feedback: {
            select: { decision: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Process by status
    const byStatus: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      PLACED: 0,
      REJECTED: 0,
    };
    for (const item of applicationsByStatus) {
      byStatus[item.status] = item._count.id;
    }

    // Process by source
    const bySource = applicationsBySource.map((item) => ({
      source: item.source || "unknown",
      count: item._count.id,
    }));

    // Process by channel
    const channelCounts = new Map<string, { channelId: string; name: string; type: string; count: number }>();
    for (const app of applicationsWithChannel) {
      if (app.sourceChannel) {
        const key = app.sourceChannel.id;
        const existing = channelCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          channelCounts.set(key, {
            channelId: app.sourceChannel.id,
            name: app.sourceChannel.name,
            type: app.sourceChannel.type,
            count: 1,
          });
        }
      }
    }
    const byChannel = Array.from(channelCounts.values())
      .sort((a, b) => b.count - a.count);

    // Process shortlists with feedback counts
    const shortlistItems = shortlists.map((sl) => {
      const approved = sl.feedback.filter((f) => f.decision === "APPROVED").length;
      const rejected = sl.feedback.filter((f) => f.decision === "REJECTED").length;
      const pending = sl.items.length - approved - rejected;

      return {
        id: sl.id,
        name: sl.name,
        shareToken: sl.shareToken,
        createdAt: sl.createdAt.toISOString(),
        candidatesCount: sl.items.length,
        feedback: {
          approved,
          rejected,
          pending: Math.max(0, pending),
        },
      };
    });

    const analytics = {
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        location: job.location,
      },
      pipeline: {
        total: totalApplications,
        recentCount: recentApplications,
        byStatus,
      },
      sources: {
        bySource,
        byChannel,
      },
      shortlists: {
        total: shortlists.length,
        items: shortlistItems,
      },
    };

    logInfo("Job analytics fetched", { agencyId: agency.id, jobId });

    return NextResponse.json(analytics);
  } catch (error) {
    return handleError(error);
  }
}
