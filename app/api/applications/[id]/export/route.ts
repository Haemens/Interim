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

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  console.error("API Error:", error);

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
// POST /api/applications/[id]/export - GDPR data export
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership, user } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can export data
    assertMinimumRole(membership, "RECRUITER");

    // Find application - ensure it belongs to this agency
    const application = await db.application.findFirst({
      where: {
        id,
        agencyId: agency.id,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            contractType: true,
            sector: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Log the export event
    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        userId: user.id,
        jobId: application.jobId,
        type: "GDPR_DATA_EXPORT",
        payload: {
          applicationId: application.id,
          candidateName: application.fullName,
          exportedBy: user.email,
        },
      },
    });

    // Build GDPR export payload
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      agency: {
        name: agency.name,
        slug: agency.slug,
      },
      candidate: {
        fullName: application.fullName,
        email: application.email,
        phone: application.phone,
        cvUrl: application.cvUrl,
      },
      application: {
        id: application.id,
        status: application.status,
        source: application.source,
        note: application.note,
        tags: application.tags,
        consentToContact: application.consentToContact,
        consentGivenAt: application.consentGivenAt,
        anonymizedAt: application.anonymizedAt,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
      },
      job: {
        id: application.job.id,
        title: application.job.title,
        location: application.job.location,
        contractType: application.job.contractType,
        sector: application.job.sector,
      },
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gdpr-export-${application.id}.json"`,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
