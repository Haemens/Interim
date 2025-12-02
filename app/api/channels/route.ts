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

const channelTypeEnum = z.enum(["TIKTOK", "INSTAGRAM", "LINKEDIN", "FACEBOOK", "OTHER"]);

const createChannelSchema = z.object({
  type: channelTypeEnum,
  name: z.string().min(1, "Name is required").max(100),
  handle: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Channels API Error", {
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
// GET /api/channels - List channels for current agency
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

    // RBAC: RECRUITER and above can list channels
    assertMinimumRole(membership, "RECRUITER");

    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isActiveParam = searchParams.get("isActive");

    // Build where clause
    const where: {
      agencyId: string;
      type?: "TIKTOK" | "INSTAGRAM" | "LINKEDIN" | "FACEBOOK" | "OTHER";
      isActive?: boolean;
    } = {
      agencyId: agency.id,
    };

    if (type && channelTypeEnum.safeParse(type).success) {
      where.type = type as "TIKTOK" | "INSTAGRAM" | "LINKEDIN" | "FACEBOOK" | "OTHER";
    }

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === "true";
    }

    // Fetch channels
    const channels = await db.channel.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            publications: true,
          },
        },
      },
    });

    logInfo("Channels listed", {
      agencyId: agency.id,
      count: channels.length,
    });

    return NextResponse.json({ channels });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// POST /api/channels - Create a new channel
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

    // RBAC: ADMIN and above can create channels
    assertMinimumRole(membership, "ADMIN");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "create channels");

    // Parse and validate body
    const body = await request.json();
    const data = createChannelSchema.parse(body);

    // Create channel
    const channel = await db.channel.create({
      data: {
        agencyId: agency.id,
        type: data.type,
        name: data.name,
        handle: data.handle || null,
        region: data.region || null,
        notes: data.notes || null,
        isActive: true,
      },
    });

    // Log event
    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        type: "CHANNEL_CREATED",
        payload: {
          channelId: channel.id,
          channelName: channel.name,
          channelType: channel.type,
        },
      },
    });

    logInfo("Channel created", {
      agencyId: agency.id,
      channelId: channel.id,
      channelType: channel.type,
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
