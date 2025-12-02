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
import { sendTemplatedEmail } from "@/lib/email";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const inviteMemberSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["ADMIN", "RECRUITER", "VIEWER"]),
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
// GET /api/team - List team members for current agency
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

    // RBAC: ADMIN and above can view team
    assertMinimumRole(membership, "ADMIN");

    // Fetch team members
    const members = await db.membership.findMany({
      where: { agencyId: agency.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            invitedAt: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // OWNER first
        { createdAt: "asc" },
      ],
    });

    // Transform to clean format
    const team = members.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      invitedAt: m.user.invitedAt,
      lastLoginAt: m.user.lastLoginAt,
      joinedAt: m.createdAt,
    }));

    return NextResponse.json({ team });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// POST /api/team - Invite a new team member
// =============================================================================

export async function POST(request: NextRequest) {
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
    const { agency, membership, user: inviter } =
      await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: ADMIN and above can invite members
    assertMinimumRole(membership, "ADMIN");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "invite team members");

    // Parse and validate body
    const body = await request.json();
    const data = inviteMemberSchema.parse(body);

    // Check if user already exists
    let user = await db.user.findUnique({
      where: { email: data.email },
    });

    // Check if already a member of this agency
    if (user) {
      const existingMembership = await db.membership.findUnique({
        where: {
          userId_agencyId: {
            userId: user.id,
            agencyId: agency.id,
          },
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: "User is already a member of this agency" },
          { status: 400 }
        );
      }
    }

    // Create user if doesn't exist
    if (!user) {
      user = await db.user.create({
        data: {
          email: data.email,
          invitedAt: new Date(),
        },
      });
    } else {
      // Update invitedAt for existing user
      await db.user.update({
        where: { id: user.id },
        data: { invitedAt: new Date() },
      });
    }

    // Create membership
    const newMembership = await db.membership.create({
      data: {
        userId: user.id,
        agencyId: agency.id,
        role: data.role,
      },
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
        userId: inviter.id,
        type: "TEAM_MEMBER_INVITED",
        payload: {
          invitedEmail: data.email,
          role: data.role,
          invitedBy: inviter.email,
        },
      },
    });

    // Send invitation email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const loginUrl = `${baseUrl}/login`;

    sendTemplatedEmail(data.email, "team_invitation", {
      inviterName: inviter.name || inviter.email,
      agencyName: agency.name,
      role: data.role,
      loginUrl,
    }).catch((err) => console.error("Failed to send invitation email:", err));

    return NextResponse.json(
      {
        message: "Invitation sent successfully",
        member: {
          membershipId: newMembership.id,
          userId: newMembership.user.id,
          email: newMembership.user.email,
          name: newMembership.user.name,
          role: newMembership.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
