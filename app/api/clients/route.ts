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
import { getClientsForAgency } from "@/modules/client";
import { logInfo } from "@/lib/log";
import { nanoid } from "nanoid";
import { assertFeature, PlanLimitError, getPlanDisplayName } from "@/modules/billing";
import { logActivityEvent } from "@/modules/activity";

// =============================================================================
// VALIDATION
// =============================================================================

const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email("Invalid email").max(200),
  contactPhone: z.string().max(50).optional(),
  sector: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  console.error("Clients API Error:", error);

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

  if (error instanceof DemoReadOnlyError) {
    return NextResponse.json(
      { error: error.message, code: "DEMO_READ_ONLY" },
      { status: 403 }
    );
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
        code: "PLAN_LIMIT_REACHED",
        feature: error.feature,
        currentPlan: error.currentPlan,
        planDisplayName: getPlanDisplayName(error.currentPlan),
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// GET /api/clients - List clients for current agency
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

    // RBAC: RECRUITER and above can view clients
    assertMinimumRole(membership, "RECRUITER");

    // Parse query params
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive = isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch clients
    const result = await getClientsForAgency(agency.id, {
      q,
      isActive,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// POST /api/clients - Create a new client
// =============================================================================

export async function POST(request: NextRequest) {
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
    const { agency, membership, user: dbUser } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and above can create clients
    assertMinimumRole(membership, "ADMIN");

    // Plan gating: check if agency can use Client CRM
    await assertFeature(agency.id, "clientCRM");

    // Demo mode: block client creation
    assertNotDemoAgency(agency, "create clients");

    // Parse and validate body
    const body = await request.json();
    const data = createClientSchema.parse(body);

    // Generate unique request token
    const requestToken = `clnt_${nanoid(16)}`;

    // Create client
    const client = await db.client.create({
      data: {
        agencyId: agency.id,
        name: data.name,
        contactName: data.contactName || null,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || null,
        sector: data.sector || null,
        notes: data.notes || null,
        requestToken,
        isActive: true,
      },
    });

    logInfo("Client created", {
      clientId: client.id,
      agencyId: agency.id,
      name: client.name,
    });

    await logActivityEvent({
      agencyId: agency.id,
      actorUserId: dbUser.id,
      targetType: "CLIENT",
      targetId: client.id,
      action: "CREATED",
      summary: `${dbUser.name || "User"} created client "${client.name}"`,
      metadata: { name: client.name }
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
