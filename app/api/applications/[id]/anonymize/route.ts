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
import { assertNotDemoAgency, DemoReadOnlyError } from "@/modules/auth/demo-mode";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  console.error("API Error:", error);

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
// POST /api/applications/[id]/anonymize - GDPR anonymization
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

    // RBAC: ADMIN and above can anonymize data
    assertMinimumRole(membership, "ADMIN");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "anonymize applications");

    // Find application - ensure it belongs to this agency
    const application = await db.application.findFirst({
      where: {
        id,
        agencyId: agency.id,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Check if already anonymized
    if (application.anonymizedAt) {
      return NextResponse.json(
        { error: "Application is already anonymized" },
        { status: 400 }
      );
    }

    // Store original name for logging before anonymization
    const originalName = application.fullName;

    // Anonymize the application
    const anonymizedApplication = await db.application.update({
      where: { id },
      data: {
        fullName: "Anonymized",
        email: null,
        phone: null,
        cvUrl: null,
        note: application.note
          ? `[ANONYMIZED] ${application.note}`
          : "[ANONYMIZED]",
        anonymizedAt: new Date(),
      },
    });

    // Log the anonymization event
    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        userId: user.id,
        jobId: application.jobId,
        type: "GDPR_DATA_ANONYMIZED",
        payload: {
          applicationId: application.id,
          originalName: originalName,
          anonymizedBy: user.email,
        },
      },
    });

    return NextResponse.json({
      message: "Application anonymized successfully",
      application: {
        id: anonymizedApplication.id,
        fullName: anonymizedApplication.fullName,
        anonymizedAt: anonymizedApplication.anonymizedAt,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
