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
import { logError } from "@/lib/log";

// =============================================================================
// TYPES
// =============================================================================

interface ActivityItem {
  id: string;
  type: string;
  createdAt: string;
  userName: string | null;
  summary: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate human-readable summary for an event
 */
function generateSummary(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "JOB_CREATED":
      return `Job "${payload.title || "Untitled"}" was created`;
    
    case "JOB_PUBLISHED":
      return `Job was published`;
    
    case "APPLICATION_CREATED":
      return `${payload.candidateName || "A candidate"} applied`;
    
    case "APPLICATION_STATUS_CHANGED":
      return `${payload.candidateName || "Candidate"} moved from ${payload.previousStatus} to ${payload.newStatus}`;
    
    case "MATCHING_CANDIDATES_NOTIFIED":
      return `${payload.notifiedCount || 0} matching candidates were notified`;
    
    case "SHORTLIST_CREATED":
      return `A shortlist was created with ${payload.candidateCount || 0} candidates`;
    
    default:
      return type.replace(/_/g, " ").toLowerCase();
  }
}

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Job activity API error", {
    error: error instanceof Error ? error.message : "Unknown error",
  });

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

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// GET /api/jobs/[jobId]/activity - Get job activity timeline
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get membership and verify RECRUITER+ role
    const context = await getCurrentMembershipOrThrow(tenantSlug);
    assertMinimumRole(context.membership, "RECRUITER");

    const agencyId = context.agency.id;

    // Verify job belongs to this agency
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        agencyId,
      },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get URL params for pagination
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    // Fetch events for this job
    const events = await db.eventLog.findMany({
      where: {
        agencyId,
        OR: [
          { jobId: jobId },
          {
            payload: {
              path: ["jobId"],
              equals: jobId,
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    // Transform to activity items
    const items: ActivityItem[] = events.map((event) => ({
      id: event.id,
      type: event.type,
      createdAt: event.createdAt.toISOString(),
      userName: event.user?.name || event.user?.email || null,
      summary: generateSummary(event.type, event.payload as Record<string, unknown>),
    }));

    return NextResponse.json({ items });
  } catch (error) {
    return handleError(error);
  }
}
