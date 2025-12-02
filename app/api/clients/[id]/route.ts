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
import { getClientDetail } from "@/modules/client";
import { logInfo } from "@/lib/log";

// =============================================================================
// VALIDATION
// =============================================================================

const updateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).optional().nullable(),
  contactEmail: z.string().email().max(200).optional(),
  contactPhone: z.string().max(50).optional().nullable(),
  sector: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  isActive: z.boolean().optional(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  console.error("Client API Error:", error);

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

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// GET /api/clients/[id] - Get client detail (360° view)
// =============================================================================

export async function GET(
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
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can view client details
    assertMinimumRole(membership, "RECRUITER");

    // Fetch client detail
    const client = await getClientDetail(agency.id, id);

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ client });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// PATCH /api/clients/[id] - Update client
// =============================================================================

export async function PATCH(
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
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and above can update clients
    assertMinimumRole(membership, "ADMIN");

    // Demo mode: block client updates
    assertNotDemoAgency(agency, "update clients");

    // Parse and validate body
    const body = await request.json();
    const data = updateClientSchema.parse(body);

    // Find existing client
    const existing = await db.client.findFirst({
      where: {
        id,
        agencyId: agency.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.sector !== undefined) updateData.sector = data.sector;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update client
    const client = await db.client.update({
      where: { id },
      data: updateData,
    });

    logInfo("Client updated", {
      clientId: client.id,
      agencyId: agency.id,
    });

    return NextResponse.json({ client });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// DELETE /api/clients/[id] - Delete client (soft delete via isActive)
// =============================================================================

export async function DELETE(
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
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and above can delete clients
    assertMinimumRole(membership, "ADMIN");

    // Demo mode: block client deletion
    assertNotDemoAgency(agency, "delete clients");

    // Find existing client
    const existing = await db.client.findFirst({
      where: {
        id,
        agencyId: agency.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await db.client.update({
      where: { id },
      data: { isActive: false },
    });

    logInfo("Client deactivated", {
      clientId: id,
      agencyId: agency.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
