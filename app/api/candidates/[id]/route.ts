import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import { assertNotDemoAgency, DemoReadOnlyError } from "@/modules/auth/demo-mode";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateCandidateSchema = z.object({
  status: z.enum(["ACTIVE", "DO_NOT_CONTACT", "BLACKLISTED"]).optional(),
  notes: z.string().max(5000).optional(),
  skills: z.array(z.string()).optional(),
  sectors: z.array(z.string()).optional(),
  location: z.string().max(200).optional(),
  lastJobTitle: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  socialSecurityNumber: z.string().max(50).optional(),
  iban: z.string().max(50).optional(),
  bic: z.string().max(20).optional(),
  hourlyRate: z.number().or(z.string().regex(/^\d+(\.\d{1,2})?$/)).optional(),
  availabilityDate: z.string().optional().nullable(),
  experienceYears: z.number().int().optional().nullable(),
  mobilityRadius: z.number().int().optional().nullable(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Candidate API Error", {
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

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// GET /api/candidates/[id] - Get single candidate profile with applications
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // RBAC: RECRUITER and above can view candidates
    assertMinimumRole(membership, "RECRUITER");

    // Find candidate - ensure it belongs to this agency
    const candidate = await db.candidateProfile.findFirst({
      where: {
        id,
        agencyId: agency.id,
      },
      include: {
        lastContactedBy: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          }
        },
        applications: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            job: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        missions: {
          orderBy: { startDate: "desc" },
          take: 10,
          include: {
            job: { select: { id: true, title: true } },
            client: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { applications: true, missions: true },
        },
        documents: {
            orderBy: { createdAt: 'desc' }
        }
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ candidate });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// PATCH /api/candidates/[id] - Update candidate profile
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, currentUser?.id ?? null);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can update candidates
    assertMinimumRole(membership, "RECRUITER");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "update candidates");

    // Parse and validate body
    const body = await request.json();
    const data = updateCandidateSchema.parse(body);

    // Find candidate - ensure it belongs to this agency
    const existingCandidate = await db.candidateProfile.findFirst({
      where: {
        id,
        agencyId: agency.id,
      },
    });

    if (!existingCandidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Update candidate
    const candidate = await db.candidateProfile.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.skills !== undefined && { skills: data.skills }),
        ...(data.sectors !== undefined && { sectors: data.sectors }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.lastJobTitle !== undefined && { lastJobTitle: data.lastJobTitle }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.socialSecurityNumber !== undefined && { socialSecurityNumber: data.socialSecurityNumber }),
        ...(data.iban !== undefined && { iban: data.iban }),
        ...(data.bic !== undefined && { bic: data.bic }),
        ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
        ...(data.availabilityDate !== undefined && { availabilityDate: data.availabilityDate ? new Date(data.availabilityDate) : null }),
        ...(data.experienceYears !== undefined && { experienceYears: data.experienceYears }),
        ...(data.mobilityRadius !== undefined && { mobilityRadius: data.mobilityRadius }),
      },
    });

    logInfo("Updated candidate profile", {
      candidateId: candidate.id,
      updates: Object.keys(data),
    });

    return NextResponse.json({ candidate });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// DELETE /api/candidates/[id] - Delete candidate (GDPR)
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, currentUser?.id ?? null);

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and above can delete candidates
    assertMinimumRole(membership, "ADMIN");

    // Demo mode: block deletion
    assertNotDemoAgency(agency, "delete candidates");

    // Find candidate - ensure it belongs to this agency
    const candidate = await db.candidateProfile.findFirst({
      where: {
        id,
        agencyId: agency.id,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Delete candidate
    await db.candidateProfile.delete({
      where: { id },
    });

    logInfo("Deleted candidate", {
      candidateId: id,
      agencyId: agency.id,
      userId: currentUser?.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
