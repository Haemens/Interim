import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * One-time endpoint to fix demo user role from RECRUITER to OWNER
 * DELETE THIS FILE after running once on production
 */
export async function POST() {
  try {
    // Find demo user
    const demoUser = await db.user.findUnique({
      where: { email: "demo@questhire.com" },
    });

    if (!demoUser) {
      return NextResponse.json({ error: "Demo user not found" }, { status: 404 });
    }

    // Find demo agency
    const demoAgency = await db.agency.findUnique({
      where: { slug: "demo-agency" },
    });

    if (!demoAgency) {
      return NextResponse.json({ error: "Demo agency not found" }, { status: 404 });
    }

    // Update membership role to OWNER
    const membership = await db.membership.updateMany({
      where: {
        userId: demoUser.id,
        agencyId: demoAgency.id,
      },
      data: {
        role: "OWNER",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Demo user role updated to OWNER",
      updated: membership.count,
    });
  } catch (error) {
    console.error("Error fixing demo role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}
