/**
 * Complete Onboarding API
 * 
 * POST /api/onboarding/complete
 * 
 * Marks the onboarding tour as completed for the current user.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { hasSeenOnboardingTour: true },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
