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

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "RECRUITER", "VIEWER"]),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  console.error("API Error:", error);

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
// PATCH /api/team/[membershipId] - Update member role
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  try {
    const { membershipId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership: currentMembership, user } =
      await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and above can update roles
    assertMinimumRole(currentMembership, "ADMIN");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "update team member roles");

    // Parse and validate body
    const body = await request.json();
    const data = updateRoleSchema.parse(body);

    // Find target membership
    const targetMembership = await db.membership.findFirst({
      where: {
        id: membershipId,
        agencyId: agency.id,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Prevent demoting the last OWNER
    if (targetMembership.role === "OWNER" && data.role !== "OWNER") {
      const ownerCount = await db.membership.count({
        where: {
          agencyId: agency.id,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last owner. Promote another member first." },
          { status: 400 }
        );
      }
    }

    // Only OWNER can promote to OWNER or demote from OWNER
    if (
      (data.role === "OWNER" || targetMembership.role === "OWNER") &&
      currentMembership.role !== "OWNER"
    ) {
      return NextResponse.json(
        { error: "Only owners can change owner roles" },
        { status: 403 }
      );
    }

    // Update role
    const updatedMembership = await db.membership.update({
      where: { id: membershipId },
      data: { role: data.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log event
    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        userId: user.id,
        type: "TEAM_ROLE_CHANGED",
        payload: {
          memberEmail: targetMembership.user.email,
          previousRole: targetMembership.role,
          newRole: data.role,
          changedBy: user.email,
        },
      },
    });

    return NextResponse.json({
      message: "Role updated successfully",
      member: {
        membershipId: updatedMembership.id,
        userId: updatedMembership.user.id,
        email: updatedMembership.user.email,
        name: updatedMembership.user.name,
        role: updatedMembership.role,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// DELETE /api/team/[membershipId] - Remove member from agency
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  try {
    const { membershipId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership: currentMembership, user } =
      await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and above can remove members
    assertMinimumRole(currentMembership, "ADMIN");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "remove team members");

    // Find target membership
    const targetMembership = await db.membership.findFirst({
      where: {
        id: membershipId,
        agencyId: agency.id,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Prevent removing the last OWNER
    if (targetMembership.role === "OWNER") {
      const ownerCount = await db.membership.count({
        where: {
          agencyId: agency.id,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last owner. Transfer ownership first." },
          { status: 400 }
        );
      }

      // Only OWNER can remove another OWNER
      if (currentMembership.role !== "OWNER") {
        return NextResponse.json(
          { error: "Only owners can remove other owners" },
          { status: 403 }
        );
      }
    }

    // Prevent removing yourself (must leave via different flow)
    if (targetMembership.userId === user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself. Use the leave team option instead." },
        { status: 400 }
      );
    }

    // Delete membership
    await db.membership.delete({
      where: { id: membershipId },
    });

    // Log event
    await db.eventLog.create({
      data: {
        agencyId: agency.id,
        userId: user.id,
        type: "TEAM_MEMBER_REMOVED",
        payload: {
          removedEmail: targetMembership.user.email,
          removedRole: targetMembership.role,
          removedBy: user.email,
        },
      },
    });

    return NextResponse.json({
      message: "Member removed successfully",
    });
  } catch (error) {
    return handleError(error);
  }
}
