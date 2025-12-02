import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/auth/memberships
 * Returns all agency memberships for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const memberships = await db.membership.findMany({
      where: { userId: session.user.id },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      memberships: memberships.map((m) => ({
        id: m.id,
        role: m.role,
        agencyId: m.agency.id,
        name: m.agency.name,
        slug: m.agency.slug,
        logoUrl: m.agency.logoUrl,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch memberships:", error);
    return NextResponse.json(
      { error: "Failed to fetch memberships" },
      { status: 500 }
    );
  }
}
