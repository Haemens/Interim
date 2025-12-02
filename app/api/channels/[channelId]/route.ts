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

const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  handle: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Channel API Error", {
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
// GET /api/channels/[channelId] - Get a single channel
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can view channels
    assertMinimumRole(membership, "RECRUITER");

    // Find channel
    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        agencyId: agency.id,
      },
      include: {
        _count: {
          select: {
            publications: true,
          },
        },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({ channel });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// PATCH /api/channels/[channelId] - Update a channel
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and above can update channels
    assertMinimumRole(membership, "ADMIN");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "update channels");

    // Find channel
    const existingChannel = await db.channel.findFirst({
      where: {
        id: channelId,
        agencyId: agency.id,
      },
    });

    if (!existingChannel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Parse and validate body
    const body = await request.json();
    const data = updateChannelSchema.parse(body);

    // Build update data
    const updateData: {
      name?: string;
      handle?: string | null;
      region?: string | null;
      notes?: string | null;
      isActive?: boolean;
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.handle !== undefined) updateData.handle = data.handle;
    if (data.region !== undefined) updateData.region = data.region;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update channel
    const channel = await db.channel.update({
      where: { id: channelId },
      data: updateData,
    });

    logInfo("Channel updated", {
      agencyId: agency.id,
      channelId: channel.id,
    });

    return NextResponse.json({ channel });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// DELETE /api/channels/[channelId] - Deactivate a channel (soft delete)
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and above can delete channels
    assertMinimumRole(membership, "ADMIN");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "delete channels");

    // Find channel
    const existingChannel = await db.channel.findFirst({
      where: {
        id: channelId,
        agencyId: agency.id,
      },
    });

    if (!existingChannel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Soft delete: set isActive = false
    const channel = await db.channel.update({
      where: { id: channelId },
      data: { isActive: false },
    });

    logInfo("Channel deactivated", {
      agencyId: agency.id,
      channelId: channel.id,
    });

    return NextResponse.json({ channel, message: "Channel deactivated" });
  } catch (error) {
    return handleError(error);
  }
}
