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
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { logInfo } from "@/lib/log";

// =============================================================================
// VALIDATION
// =============================================================================

const updateJobRequestSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["NEW", "IN_REVIEW", "CONVERTED_TO_JOB", "REJECTED"]).optional(),
  linkedJobId: z.string().cuid().optional().nullable(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  console.error("Job Requests API Error:", error);

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.issues },
      { status: 400 }
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof ForbiddenError || error instanceof MembershipNotFoundError) {
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
// GET /api/job-requests - List job requests for current agency
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

    // RBAC: RECRUITER and above can view job requests
    assertMinimumRole(membership, "RECRUITER");

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const q = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    type JobRequestStatus = "NEW" | "IN_REVIEW" | "CONVERTED_TO_JOB" | "REJECTED";
    const where: {
      agencyId: string;
      status?: JobRequestStatus;
      clientId?: string;
      OR?: Array<{ title?: { contains: string; mode: "insensitive" } }>;
    } = {
      agencyId: agency.id,
    };

    if (status && status !== "all") {
      where.status = status as JobRequestStatus;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
      ];
    }

    // Fetch job requests
    const [jobRequests, total] = await Promise.all([
      db.jobRequest.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              contactName: true,
            },
          },
          linkedJob: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.jobRequest.count({ where }),
    ]);

    return NextResponse.json({
      jobRequests,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + jobRequests.length < total,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// PATCH /api/job-requests - Update job request status
// =============================================================================

export async function PATCH(request: NextRequest) {
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

    // RBAC: RECRUITER and above can update job requests
    assertMinimumRole(membership, "RECRUITER");

    // Parse and validate body
    const body = await request.json();
    const data = updateJobRequestSchema.parse(body);

    // Find job request - ensure it belongs to this agency
    const existing = await db.jobRequest.findFirst({
      where: {
        id: data.id,
        agencyId: agency.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Job request not found" },
        { status: 404 }
      );
    }

    // Build update data
    type JobRequestStatus = "NEW" | "IN_REVIEW" | "CONVERTED_TO_JOB" | "REJECTED";
    const updateData: {
      status?: JobRequestStatus;
      linkedJobId?: string | null;
    } = {};

    if (data.status) {
      updateData.status = data.status as JobRequestStatus;
    }

    if (data.linkedJobId !== undefined) {
      updateData.linkedJobId = data.linkedJobId;
    }

    // Update job request
    const updated = await db.jobRequest.update({
      where: { id: data.id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contactName: true,
          },
        },
        linkedJob: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    logInfo("Job request updated", {
      jobRequestId: updated.id,
      agencyId: agency.id,
      status: updated.status,
    });

    return NextResponse.json({ jobRequest: updated });
  } catch (error) {
    return handleError(error);
  }
}
