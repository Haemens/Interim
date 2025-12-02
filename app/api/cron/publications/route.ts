import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ENV } from "@/lib/env";
import { executePublish, PublishError, MAX_PUBLISH_ATTEMPTS } from "@/modules/social";
import { logInfo, logError, logWarn } from "@/lib/log";

// =============================================================================
// CONSTANTS
// =============================================================================

const BATCH_SIZE = 10;

// =============================================================================
// POST /api/cron/publications - Process scheduled publications
// =============================================================================

/**
 * Cron endpoint to process scheduled publications.
 *
 * This endpoint should be called periodically (e.g., every minute) by a cron job.
 * It finds publications that are due for publishing and attempts to publish them.
 *
 * Security: Protected by CRON_SECRET token.
 *
 * @example
 * ```bash
 * curl -X POST https://your-app.com/api/cron/publications \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = ENV.CRON_SECRET;

    if (cronSecret) {
      const providedToken = authHeader?.replace("Bearer ", "");
      if (providedToken !== cronSecret) {
        logWarn("Cron endpoint called with invalid secret");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (ENV.IS_PRODUCTION) {
      // In production, require CRON_SECRET
      logError("CRON_SECRET not configured in production");
      return NextResponse.json(
        { error: "Cron endpoint not configured" },
        { status: 503 }
      );
    }

    const now = new Date();

    logInfo("Cron: Processing scheduled publications", { timestamp: now.toISOString() });

    // Find due publications
    const duePublications = await db.publication.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: now },
        attemptCount: { lt: MAX_PUBLISH_ATTEMPTS },
      },
      take: BATCH_SIZE,
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        agencyId: true,
        agency: { select: { slug: true } },
      },
    });

    if (duePublications.length === 0) {
      logInfo("Cron: No publications due for processing");
      return NextResponse.json({
        processed: 0,
        succeeded: 0,
        failed: 0,
        message: "No publications due for processing",
      });
    }

    logInfo("Cron: Found due publications", { count: duePublications.length });

    let succeeded = 0;
    let failed = 0;
    const results: Array<{
      publicationId: string;
      status: "success" | "failed";
      error?: string;
    }> = [];

    // Process each publication using shared logic
    for (const publication of duePublications) {
      try {
        const outcome = await executePublish({
          publicationId: publication.id,
          agencyId: publication.agencyId,
          agencySlug: publication.agency.slug,
        });

        if (outcome.success) {
          succeeded++;
          results.push({ publicationId: publication.id, status: "success" });
          logInfo("Cron: Publication published", { publicationId: publication.id });
        } else {
          failed++;
          results.push({
            publicationId: publication.id,
            status: "failed",
            error: outcome.publication.errorMessage || undefined,
          });
          logError("Cron: Publication failed", {
            publicationId: publication.id,
            error: outcome.publication.errorMessage,
          });
        }
      } catch (error) {
        // Handle PublishError and unexpected errors
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorCode = error instanceof PublishError ? error.code : undefined;

        failed++;
        results.push({
          publicationId: publication.id,
          status: "failed",
          error: errorMessage,
        });

        logError("Cron: Publication processing error", {
          publicationId: publication.id,
          error: errorMessage,
          code: errorCode,
        });
      }
    }

    logInfo("Cron: Processing complete", {
      processed: duePublications.length,
      succeeded,
      failed,
    });

    return NextResponse.json({
      processed: duePublications.length,
      succeeded,
      failed,
      results,
      message: `Processed ${duePublications.length} publications: ${succeeded} succeeded, ${failed} failed`,
    });
  } catch (error) {
    logError("Cron: Fatal error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for health checks
export async function GET(request: NextRequest) {
  // Verify cron secret for GET as well
  const authHeader = request.headers.get("authorization");
  const cronSecret = ENV.CRON_SECRET;

  if (cronSecret) {
    const providedToken = authHeader?.replace("Bearer ", "");
    if (providedToken !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Return pending count
  const pendingCount = await db.publication.count({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: new Date() },
      attemptCount: { lt: MAX_PUBLISH_ATTEMPTS },
    },
  });

  return NextResponse.json({
    status: "ok",
    pendingPublications: pendingCount,
    maxAttempts: MAX_PUBLISH_ATTEMPTS,
    batchSize: BATCH_SIZE,
  });
}
