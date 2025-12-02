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
import { ApplicationStatus } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

interface ApplicationCard {
  id: string;
  candidateName: string;
  candidateEmail: string | null;
  candidateLocation: string | null;
  candidatePhone: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  notesPreview: string | null;
  cvUrl: string | null;
}

interface PipelineColumn {
  status: ApplicationStatus;
  label: string;
  applications: ApplicationCard[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_ORDER: { status: ApplicationStatus; label: string }[] = [
  { status: "NEW", label: "New" },
  { status: "CONTACTED", label: "Contacted" },
  { status: "QUALIFIED", label: "Qualified" },
  { status: "PLACED", label: "Placed" },
  { status: "REJECTED", label: "Rejected" },
];

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Job applications API error", {
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
// GET /api/jobs/[jobId]/applications - Get applications grouped by status
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
      select: {
        id: true,
        title: true,
        location: true,
        status: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch all applications for this job with candidate info
    const applications = await db.application.findMany({
      where: {
        jobId,
      },
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            location: true,
            cvUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group applications by status
    const applicationsByStatus = new Map<ApplicationStatus, ApplicationCard[]>();

    // Initialize all columns
    for (const { status } of STATUS_ORDER) {
      applicationsByStatus.set(status, []);
    }

    // Populate columns
    for (const app of applications) {
      const card: ApplicationCard = {
        id: app.id,
        candidateName: app.candidate?.fullName || app.fullName,
        candidateEmail: app.candidate?.email || app.email,
        candidateLocation: app.candidate?.location || null,
        candidatePhone: app.candidate?.phone || app.phone,
        status: app.status,
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString(),
        tags: app.tags,
        notesPreview: app.note ? app.note.slice(0, 100) : null,
        cvUrl: app.candidate?.cvUrl || app.cvUrl,
      };

      const statusApps = applicationsByStatus.get(app.status);
      if (statusApps) {
        statusApps.push(card);
      }
    }

    // Build response columns
    const columns: PipelineColumn[] = STATUS_ORDER.map(({ status, label }) => ({
      status,
      label,
      applications: applicationsByStatus.get(status) || [],
    }));

    return NextResponse.json({
      job: {
        id: job.id,
        title: job.title,
        location: job.location,
        status: job.status,
      },
      columns,
      totalApplications: applications.length,
    });
  } catch (error) {
    return handleError(error);
  }
}
