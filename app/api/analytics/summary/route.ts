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
import { assertFeature, PlanLimitError } from "@/modules/billing";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Analytics API Error", {
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

  if (error instanceof PlanLimitError) {
    return NextResponse.json(
      {
        error: error.message,
        code: "PLAN_LIMIT",
        currentPlan: error.currentPlan,
        requiredPlan: error.requiredPlan,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// GET /api/analytics/summary - Get analytics summary for current agency
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const tenantSlug = getTenantSlugFromRequest(request);
    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can view analytics
    assertMinimumRole(membership, "RECRUITER");

    // Plan check: ensure analytics is available
    await assertFeature(agency.id, "analytics");

    logInfo("Fetching analytics summary", { agencyId: agency.id });

    // Calculate date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [
      jobCounts,
      applicationCounts,
      applicationsByStatus,
      last7DaysApplications,
      last30DaysApplications,
      topJobs,
      applicationsBySource,
      applicationsWithChannel,
    ] = await Promise.all([
      // Job counts by status
      db.job.groupBy({
        by: ["status"],
        where: { agencyId: agency.id },
        _count: { id: true },
      }),

      // Total applications
      db.application.count({
        where: { agencyId: agency.id },
      }),

      // Applications by status
      db.application.groupBy({
        by: ["status"],
        where: { agencyId: agency.id },
        _count: { id: true },
      }),

      // Applications in last 7 days
      db.application.count({
        where: {
          agencyId: agency.id,
          createdAt: { gte: sevenDaysAgo },
        },
      }),

      // Applications in last 30 days
      db.application.count({
        where: {
          agencyId: agency.id,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),

      // Top jobs by applications
      db.job.findMany({
        where: { agencyId: agency.id },
        select: {
          id: true,
          title: true,
          _count: {
            select: { applications: true },
          },
        },
        orderBy: {
          applications: { _count: "desc" },
        },
        take: 5,
      }),

      // Applications grouped by source
      db.application.groupBy({
        by: ["source"],
        where: { agencyId: agency.id },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),

      // Applications with channel info (for channel breakdown)
      db.application.findMany({
        where: {
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
    ]);

    // Process job counts
    const jobCountsMap = {
      total: 0,
      active: 0,
      draft: 0,
      paused: 0,
      archived: 0,
    };

    for (const item of jobCounts) {
      const count = item._count.id;
      jobCountsMap.total += count;
      switch (item.status) {
        case "ACTIVE":
          jobCountsMap.active = count;
          break;
        case "DRAFT":
          jobCountsMap.draft = count;
          break;
        case "PAUSED":
          jobCountsMap.paused = count;
          break;
        case "ARCHIVED":
          jobCountsMap.archived = count;
          break;
      }
    }

    // Process application counts by status
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

    // Format top jobs
    const topJobsByApplications = topJobs.map((job) => ({
      jobId: job.id,
      title: job.title,
      applicationsCount: job._count.applications,
    }));

    // Process applications by source
    const bySource = applicationsBySource.map((item) => ({
      source: item.source || "unknown",
      count: item._count.id,
    }));

    // Process applications by channel
    const channelCounts = new Map<string, { channelId: string; channelName: string; type: string; count: number }>();
    for (const app of applicationsWithChannel) {
      if (app.sourceChannel) {
        const key = app.sourceChannel.id;
        const existing = channelCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          channelCounts.set(key, {
            channelId: app.sourceChannel.id,
            channelName: app.sourceChannel.name,
            type: app.sourceChannel.type,
            count: 1,
          });
        }
      }
    }
    const byChannel = Array.from(channelCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const summary = {
      jobCounts: jobCountsMap,
      applicationCounts: {
        total: applicationCounts,
        byStatus,
      },
      recentActivity: {
        last7DaysApplications,
        last30DaysApplications,
      },
      topJobsByApplications,
      applicationSources: {
        bySource,
        byChannel,
      },
    };

    logInfo("Analytics summary fetched", { agencyId: agency.id });

    return NextResponse.json(summary);
  } catch (error) {
    return handleError(error);
  }
}
