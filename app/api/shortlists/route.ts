import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
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
import { assertFeature, PlanLimitError, getPlanDisplayName } from "@/modules/billing";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createShortlistSchema = z.object({
  jobId: z.string().cuid(),
  name: z.string().min(1, "Name is required").max(200),
  note: z.string().max(2000).optional(),
  clientId: z.string().cuid().optional().nullable(),
  applicationIds: z.array(z.string().cuid()).optional().default([]),
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a URL-safe share token
 */
function generateShareToken(): string {
  return crypto.randomBytes(12).toString("base64url");
}

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Shortlists API Error", {
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

  if (error instanceof PlanLimitError) {
    return NextResponse.json(
      {
        error: error.message,
        code: "PLAN_LIMIT",
        currentPlan: error.currentPlan,
        requiredPlan: error.requiredPlan,
        planDisplayName: getPlanDisplayName(error.currentPlan),
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// GET /api/shortlists - List shortlists for current agency
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

    // RBAC: RECRUITER and above can list shortlists
    assertMinimumRole(membership, "RECRUITER");

    // Parse query params
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const clientId = searchParams.get("clientId");
    const search = searchParams.get("q");

    // Build query
    const where = {
      agencyId: agency.id,
      ...(jobId && { jobId }),
      ...(clientId && { clientId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { job: { title: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };

    // Fetch shortlists
    const shortlists = await db.shortlist.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        job: {
          select: {
            id: true,
            title: true,
          },
        },
        items: {
          include: {
            application: {
              select: {
                id: true,
                fullName: true,
                status: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    // Build share URLs
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const shortlistsWithUrls = shortlists.map((s) => ({
      ...s,
      shareUrl: `${baseUrl}/shortlist/${s.shareToken}`,
    }));

    return NextResponse.json({ shortlists: shortlistsWithUrls });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// POST /api/shortlists - Create a new shortlist
// =============================================================================

export async function POST(request: NextRequest) {
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

    // RBAC: RECRUITER and above can create shortlists
    assertMinimumRole(membership, "RECRUITER");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "create shortlists");

    // Plan check: ensure shortlists feature is available
    await assertFeature(agency.id, "shortlists");

    // Parse and validate body
    const body = await request.json();
    const data = createShortlistSchema.parse(body);

    // Verify job exists and belongs to this agency
    const job = await db.job.findFirst({
      where: {
        id: data.jobId,
        agencyId: agency.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify all applications exist and belong to this agency
    if (data.applicationIds.length > 0) {
      const validApplications = await db.application.count({
        where: {
          id: { in: data.applicationIds },
          agencyId: agency.id,
          jobId: data.jobId,
        },
      });

      if (validApplications !== data.applicationIds.length) {
        return NextResponse.json(
          { error: "Some applications are invalid or don't belong to this job" },
          { status: 400 }
        );
      }
    }

    // Create shortlist with items
    const shortlist = await db.shortlist.create({
      data: {
        agencyId: agency.id,
        jobId: data.jobId,
        name: data.name,
        note: data.note,
        clientId: data.clientId || null,
        shareToken: generateShareToken(),
        items: {
          create: data.applicationIds.map((appId, index) => ({
            applicationId: appId,
            order: index,
          })),
        },
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
          },
        },
        items: {
          include: {
            application: {
              select: {
                id: true,
                fullName: true,
                status: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    return NextResponse.json(
      {
        shortlist: {
          ...shortlist,
          shareUrl: `${baseUrl}/shortlist/${shortlist.shareToken}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
