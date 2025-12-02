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
import { assertNotDemoAgency, DemoReadOnlyError } from "@/modules/auth/demo-mode";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const publicationStatusEnum = z.enum(["PLANNED", "PUBLISHED", "FAILED"]);

const createPublicationSchema = z.object({
  contentId: z.string().cuid(),
  channelId: z.string().cuid(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

const updatePublicationSchema = z.object({
  id: z.string().cuid(),
  status: publicationStatusEnum.optional(),
  externalUrl: z.string().url().max(500).optional().nullable(),
  errorMessage: z.string().max(2000).optional().nullable(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Publications API Error", {
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
// GET /api/jobs/[jobId]/publications - List publications for a job
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can view publications
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

    // Fetch publications with full details
    const publications = await db.publication.findMany({
      where: {
        jobId,
        agencyId: agency.id,
      },
      orderBy: [{ status: "asc" }, { scheduledAt: "asc" }, { createdAt: "desc" }],
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            type: true,
            handle: true,
            region: true,
          },
        },
        content: {
          select: {
            id: true,
            variant: true,
            title: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Fetch all active channels for the agency (for campaign matrix)
    const channels = await db.channel.findMany({
      where: {
        agencyId: agency.id,
        isActive: true,
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: {
        id: true,
        type: true,
        name: true,
        handle: true,
        region: true,
      },
    });

    // Fetch all content for this job (for campaign matrix)
    const contents = await db.jobPostContent.findMany({
      where: {
        jobId,
        agencyId: agency.id,
      },
      orderBy: [{ variant: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        variant: true,
        title: true,
        status: true,
      },
    });

    logInfo("Publications listed", {
      agencyId: agency.id,
      jobId,
      count: publications.length,
    });

    return NextResponse.json({ 
      publications,
      channels,
      contents,
    });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// POST /api/jobs/[jobId]/publications - Create a new publication
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership, user } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can create publications
    assertMinimumRole(membership, "RECRUITER");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "create publications");

    // Parse and validate body
    const body = await request.json();
    const data = createPublicationSchema.parse(body);

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

    // Verify content exists and belongs to this job
    const content = await db.jobPostContent.findFirst({
      where: {
        id: data.contentId,
        jobId,
        agencyId: agency.id,
      },
    });

    if (!content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Verify channel exists and belongs to agency
    const channel = await db.channel.findFirst({
      where: {
        id: data.channelId,
        agencyId: agency.id,
        isActive: true,
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found or inactive" }, { status: 404 });
    }

    // Create publication
    const publication = await db.publication.create({
      data: {
        agencyId: agency.id,
        jobId,
        contentId: data.contentId,
        channelId: data.channelId,
        status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        createdById: user.id,
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            type: true,
            handle: true,
          },
        },
        content: {
          select: {
            id: true,
            variant: true,
            title: true,
            status: true,
          },
        },
      },
    });

    // Log event
    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        userId: user.id,
        jobId,
        type: "PUBLICATION_PLANNED",
        payload: {
          publicationId: publication.id,
          channelName: channel.name,
          channelType: channel.type,
          contentVariant: content.variant,
          scheduledAt: data.scheduledAt,
        },
      },
    });

    logInfo("Publication created", {
      agencyId: agency.id,
      jobId,
      publicationId: publication.id,
      channelId: channel.id,
    });

    return NextResponse.json({ publication }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// PATCH /api/jobs/[jobId]/publications - Update a publication
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can update publications
    assertMinimumRole(membership, "RECRUITER");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "update publications");

    // Parse and validate body
    const body = await request.json();
    const data = updatePublicationSchema.parse(body);

    // Find publication
    const existingPublication = await db.publication.findFirst({
      where: {
        id: data.id,
        jobId,
        agencyId: agency.id,
      },
    });

    if (!existingPublication) {
      return NextResponse.json({ error: "Publication not found" }, { status: 404 });
    }

    // Build update data
    type PublicationStatus = "DRAFT" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED";
    const updateData: {
      status?: PublicationStatus;
      externalUrl?: string | null;
      errorMessage?: string | null;
      publishedAt?: Date | null;
    } = {};

    if (data.status !== undefined) {
      updateData.status = data.status as PublicationStatus;
      // Set publishedAt when status changes to PUBLISHED
      if (data.status === "PUBLISHED" && existingPublication.status !== "PUBLISHED") {
        updateData.publishedAt = new Date();
      }
    }

    if (data.externalUrl !== undefined) updateData.externalUrl = data.externalUrl;
    if (data.errorMessage !== undefined) updateData.errorMessage = data.errorMessage;

    // Update publication
    const publication = await db.publication.update({
      where: { id: data.id },
      data: updateData,
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            type: true,
            handle: true,
          },
        },
        content: {
          select: {
            id: true,
            variant: true,
            title: true,
            status: true,
          },
        },
      },
    });

    logInfo("Publication updated", {
      agencyId: agency.id,
      jobId,
      publicationId: publication.id,
      newStatus: data.status,
    });

    return NextResponse.json({ publication });
  } catch (error) {
    return handleError(error);
  }
}
