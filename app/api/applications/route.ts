import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantSlugWithFallback, getCurrentAgencyOrThrow } from "@/lib/tenant";
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
import { sendTemplatedEmail } from "@/lib/email";
import { logInfo, logError, logEvent } from "@/lib/log";
import { captureException } from "@/lib/monitoring";
import { getClientIp } from "@/lib/client-ip";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { upsertCandidateFromApplication } from "@/modules/candidate/service";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateApplicationSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PLACED", "REJECTED"]).optional(),
  note: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
});

const createApplicationSchema = z.object({
  jobId: z.string().cuid(),
  fullName: z.string().min(1, "Name is required").max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  cvUrl: z.string().url().optional().or(z.literal("")),
  source: z.string().max(50).optional(),
  sourceDetail: z.string().max(500).optional(),
  channelId: z.string().cuid().optional().or(z.literal("")),
  consentToContact: z.boolean().default(true),
  availabilityDate: z.string().optional(), // ISO date string
  mobilityRadius: z.number().optional(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  // Log all errors
  logError("Applications API Error", {
    error: error instanceof Error ? error.message : "Unknown error",
    type: error instanceof Error ? error.constructor.name : typeof error,
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

  // Capture unexpected errors for monitoring
  captureException(error, {
    route: "/api/applications",
    errorCode: "INTERNAL_ERROR",
  });

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// GET /api/applications - List applications for current agency with search & filters
// =============================================================================

export async function GET(request: NextRequest) {
  try {
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

    // RBAC: RECRUITER and above can list applications
    assertMinimumRole(membership, "RECRUITER");

    // Parse query params
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const status = searchParams.get("status");
    const q = searchParams.get("q"); // search query
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query - always filter by agencyId for tenant isolation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      agencyId: agency.id,
    };

    if (jobId) {
      where.jobId = jobId;
    }

    if (status) {
      where.status = status as "NEW" | "CONTACTED" | "QUALIFIED" | "PLACED" | "REJECTED";
    }

    // Search filter (fullName, email, tags, note)
    if (q && q.trim()) {
      const searchTerm = q.trim();
      where.OR = [
        { fullName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { note: { contains: searchTerm, mode: "insensitive" } },
        { tags: { has: searchTerm } },
      ];
    }

    // Fetch applications
    const [applications, total] = await Promise.all([
      db.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          job: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      db.application.count({ where }),
    ]);

    return NextResponse.json({
      applications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + applications.length < total,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// POST /api/applications - Create a new application (public, for job pages)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for public applications
    const clientIp = getClientIp(request);
    const rateLimitResponse = await applyRateLimit(
      `apply-${clientIp}`,
      RATE_LIMITS.APPLICATION
    );
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get agency (no auth required for public applications)
    const agency = await getCurrentAgencyOrThrow(tenantSlug);

    // Parse and validate body
    const body = await request.json();
    const data = createApplicationSchema.parse(body);

    // Verify job exists and belongs to this agency
    const job = await db.job.findFirst({
      where: {
        id: data.jobId,
        agencyId: agency.id,
        status: "ACTIVE", // Only accept applications for active jobs
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found or not accepting applications" },
        { status: 404 }
      );
    }

    // Validate channelId if provided - must belong to same agency
    let validChannelId: string | null = null;
    if (data.channelId) {
      const channel = await db.channel.findFirst({
        where: {
          id: data.channelId,
          agencyId: agency.id,
        },
      });
      if (channel) {
        validChannelId = channel.id;
      }
      // If channel not found or doesn't belong to agency, we silently ignore it
      // (don't fail the application, just don't track the channel)
    }

    // Handle CandidateProfile creation/update if email is provided
    let candidateId: string | null = null;
    
    if (data.email) {
        const result = await upsertCandidateFromApplication({
            agencyId: agency.id,
            email: data.email,
            fullName: data.fullName,
            phone: data.phone || null,
            cvUrl: data.cvUrl || null,
            availabilityDate: data.availabilityDate ? new Date(data.availabilityDate) : null,
            mobilityRadius: data.mobilityRadius || null,
            jobId: job.id,
        });
        candidateId = result.id;
        
        // Log event for application (using candidateId)
        // Note: upsertCandidateFromApplication doesn't log events yet, we keep existing logs below for Application
    }

    // Create application with source tracking
    const application = await db.application.create({
      data: {
        jobId: job.id,
        agencyId: agency.id,
        candidateId,
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        cvUrl: data.cvUrl || null,
        source: data.source || "direct",
        sourceDetail: data.sourceDetail || null,
        sourceChannelId: validChannelId,
        status: "NEW",
        consentToContact: data.consentToContact,
        consentGivenAt: data.consentToContact ? new Date() : null,
      },
    });

    // Log event
    await logEvent({
      type: "APPLICATION_CREATED",
      agencyId: agency.id,
      jobId: job.id,
      payload: {
        applicationId: application.id,
        candidateName: application.fullName,
        jobTitle: job.title,
        candidateId,
      },
    });

    // Send notification emails (async, don't block response)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const applicationUrl = `${baseUrl}/dashboard/applications/${application.id}`;

    // Email to agency
    if (agency.email) {
      sendTemplatedEmail(agency.email, "new_application_agency", {
        candidateName: application.fullName,
        jobTitle: job.title,
        agencyName: agency.name,
        applicationUrl,
      }).catch((err) => console.error("Failed to send agency notification:", err));
    }

    // Email to candidate (if consent given and email provided)
    if (application.email && application.consentToContact) {
      sendTemplatedEmail(application.email, "new_application_candidate", {
        candidateName: application.fullName,
        jobTitle: job.title,
        agencyName: agency.name,
      }).catch((err) => console.error("Failed to send candidate confirmation:", err));
    }

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// PATCH /api/applications - Update application status/note
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, currentUser?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership, user } =
      await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can update applications
    assertMinimumRole(membership, "RECRUITER");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "update applications");

    // Parse and validate body
    const body = await request.json();
    const data = updateApplicationSchema.parse(body);

    // Find application - ensure it belongs to this agency
    const existing = await db.application.findFirst({
      where: {
        id: data.id,
        agencyId: agency.id, // Tenant isolation
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: {
      status?: "NEW" | "CONTACTED" | "QUALIFIED" | "PLACED" | "REJECTED";
      note?: string;
      tags?: string[];
    } = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.tags !== undefined) updateData.tags = data.tags;

    // Update application
    const application = await db.application.update({
      where: { id: data.id },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Log status change if applicable
    if (data.status && data.status !== existing.status) {
      await db.eventLog.create({
        data: {
          agencyId: agency.id,
          userId: user.id,
          jobId: application.jobId,
          type: "APPLICATION_STATUS_CHANGED",
          payload: {
            applicationId: application.id,
            candidateName: application.fullName,
            previousStatus: existing.status,
            newStatus: data.status,
          },
        },
      });
    }

    return NextResponse.json({ application });
  } catch (error) {
    return handleError(error);
  }
}
