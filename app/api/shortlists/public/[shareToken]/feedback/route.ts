import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logInfo } from "@/lib/log";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { isDemoAgencySlug } from "@/modules/auth/demo-mode";
import { syncApplicationStatusFromFeedback, isFeedbackSyncEnabled } from "@/modules/shortlist";

// =============================================================================
// VALIDATION
// =============================================================================

const feedbackSchema = z.object({
  applicationId: z.string().cuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().max(1000).optional(),
});

// =============================================================================
// GET /api/shortlists/public/[shareToken]/feedback
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params;

    if (!shareToken) {
      return NextResponse.json(
        { error: "Share token is required" },
        { status: 400 }
      );
    }

    // Find shortlist by share token
    const shortlist = await db.shortlist.findUnique({
      where: { shareToken },
      select: {
        id: true,
        agencyId: true,
      },
    });

    if (!shortlist) {
      return NextResponse.json(
        { error: "Shortlist not found" },
        { status: 404 }
      );
    }

    // Get existing feedback for this shortlist
    const feedback = await db.clientFeedback.findMany({
      where: { shortlistId: shortlist.id },
      select: {
        id: true,
        applicationId: true,
        decision: true,
        comment: true,
        updatedAt: true,
      },
    });

    // Convert to a map for easier lookup on the client
    const feedbackMap = feedback.reduce(
      (acc, f) => {
        acc[f.applicationId] = {
          decision: f.decision,
          comment: f.comment,
          updatedAt: f.updatedAt.toISOString(),
        };
        return acc;
      },
      {} as Record<string, { decision: string; comment: string | null; updatedAt: string }>
    );

    return NextResponse.json({ feedback: feedbackMap });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/shortlists/public/[shareToken]/feedback
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params;

    if (!shareToken) {
      return NextResponse.json(
        { error: "Share token is required" },
        { status: 400 }
      );
    }

    // Find shortlist by share token
    const shortlist = await db.shortlist.findUnique({
      where: { shareToken },
      include: {
        agency: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        items: {
          select: {
            applicationId: true,
          },
        },
      },
    });

    if (!shortlist) {
      return NextResponse.json(
        { error: "Shortlist not found" },
        { status: 404 }
      );
    }

    // Rate limit by IP + shareToken
    const clientIp = getClientIp(request);
    const rateLimitKey = `feedback:${clientIp}:${shareToken}`;
    const rateLimitResponse = await applyRateLimit(rateLimitKey, RATE_LIMITS.API_GENERAL);

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate body
    const body = await request.json();
    const data = feedbackSchema.parse(body);

    // Verify application is in this shortlist
    const isInShortlist = shortlist.items.some(
      (item) => item.applicationId === data.applicationId
    );

    if (!isInShortlist) {
      return NextResponse.json(
        { error: "Application not found in this shortlist" },
        { status: 400 }
      );
    }

    // Check if this is a demo agency
    const isDemo = isDemoAgencySlug(shortlist.agency.slug);

    // For demo agency, return success without actually creating
    if (isDemo) {
      return NextResponse.json({
        success: true,
        message: "Feedback recorded. (Demo mode - not actually stored)",
        feedback: {
          applicationId: data.applicationId,
          decision: data.decision,
          comment: data.comment || null,
        },
      });
    }

    // Create or update feedback
    const feedback = await db.clientFeedback.upsert({
      where: {
        shortlistId_applicationId: {
          shortlistId: shortlist.id,
          applicationId: data.applicationId,
        },
      },
      create: {
        agencyId: shortlist.agency.id,
        shortlistId: shortlist.id,
        applicationId: data.applicationId,
        decision: data.decision,
        comment: data.comment || null,
      },
      update: {
        decision: data.decision,
        comment: data.comment || null,
      },
    });

    logInfo("Client feedback submitted", {
      feedbackId: feedback.id,
      shortlistId: shortlist.id,
      applicationId: data.applicationId,
      decision: data.decision,
    });

    // Auto-sync application status if enabled
    let syncResult = null;
    if (isFeedbackSyncEnabled()) {
      syncResult = await syncApplicationStatusFromFeedback({
        feedbackId: feedback.id,
        applicationId: data.applicationId,
        shortlistId: shortlist.id,
        shortlistName: shortlist.name,
        agencyId: shortlist.agency.id,
        decision: data.decision,
        isDemo: false, // Already handled demo mode above
      });

      if (syncResult.synced) {
        logInfo("Application status synced from feedback", {
          applicationId: data.applicationId,
          previousStatus: syncResult.previousStatus,
          newStatus: syncResult.newStatus,
        });
      }
    }

    return NextResponse.json({
      success: true,
      feedback: {
        applicationId: feedback.applicationId,
        decision: feedback.decision,
        comment: feedback.comment,
      },
      sync: syncResult ? {
        synced: syncResult.synced,
        previousStatus: syncResult.previousStatus,
        newStatus: syncResult.newStatus,
        reason: syncResult.reason,
      } : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
