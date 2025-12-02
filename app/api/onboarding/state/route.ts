/**
 * Onboarding State API
 * 
 * GET /api/onboarding/state
 * 
 * Returns the current user's onboarding tour state.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { hasSeenOnboardingTour: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      hasSeenTour: user.hasSeenOnboardingTour,
    });
  } catch (error) {
    console.error("Failed to get onboarding state:", error);
    return NextResponse.json(
      { error: "Failed to get onboarding state" },
      { status: 500 }
    );
  }
}
