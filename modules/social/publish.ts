/**
 * Social Publishing Logic
 *
 * Shared logic for publishing content to social platforms.
 * Used by both the publish endpoint and the cron job.
 */

import { db } from "@/lib/db";
import { logInfo, logError } from "@/lib/log";
import { isDemoAgency } from "@/modules/auth/demo-mode";
import { getProviderForChannelType } from "./index";
import type { PublishResult } from "./providers/base";

// =============================================================================
// TYPES
// =============================================================================

export interface PublishContext {
  publicationId: string;
  agencyId: string;
  agencySlug?: string;
  userId?: string;
}

export interface PublishOutcome {
  success: boolean;
  publication: {
    id: string;
    status: string;
    publishedAt?: Date | null;
    externalUrl?: string | null;
    externalId?: string | null;
    errorMessage?: string | null;
  };
  providerResult?: PublishResult;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const MAX_PUBLISH_ATTEMPTS = 5;

// =============================================================================
// MAIN PUBLISH FUNCTION
// =============================================================================

/**
 * Execute the publish flow for a publication.
 *
 * This function:
 * 1. Validates the publication state
 * 2. Updates status to PUBLISHING
 * 3. Calls the appropriate provider
 * 4. Updates the publication with the result
 * 5. Creates an event log entry
 *
 * @param ctx - Publication context
 * @returns Publish outcome with updated publication data
 */
export async function executePublish(ctx: PublishContext): Promise<PublishOutcome> {
  const { publicationId, agencyId, agencySlug, userId } = ctx;

  // Load publication with all related data
  const publication = await db.publication.findFirst({
    where: {
      id: publicationId,
      agencyId,
    },
    include: {
      channel: true,
      content: true,
      job: { select: { id: true, title: true } },
      agency: { select: { id: true, slug: true } },
    },
  });

  if (!publication) {
    throw new PublishError("PUBLICATION_NOT_FOUND", "Publication not found");
  }

  // Idempotency check: already published
  if (publication.status === "PUBLISHED") {
    logInfo("[Publish] Publication already published", { publicationId });
    return {
      success: true,
      publication: {
        id: publication.id,
        status: "PUBLISHED",
        publishedAt: publication.publishedAt,
        externalUrl: publication.externalUrl,
        externalId: publication.externalId,
      },
    };
  }

  // Idempotency check: currently publishing
  if (publication.status === "PUBLISHING") {
    logInfo("[Publish] Publication already in progress", { publicationId });
    throw new PublishError("PUBLISHING_IN_PROGRESS", "Publication is currently being processed");
  }

  // Check max attempts
  if (publication.attemptCount >= MAX_PUBLISH_ATTEMPTS) {
    logInfo("[Publish] Max attempts reached", { publicationId, attemptCount: publication.attemptCount });
    throw new PublishError("MAX_ATTEMPTS_REACHED", `Maximum publish attempts (${MAX_PUBLISH_ATTEMPTS}) reached`);
  }

  // Get the appropriate provider
  const provider = getProviderForChannelType(publication.channel.type);
  if (!provider) {
    throw new PublishError("NO_PROVIDER", `No provider available for channel type: ${publication.channel.type}`);
  }

  // Check if demo mode
  const isDemo = isDemoAgency({ slug: agencySlug || publication.agency.slug });

  // Update status to PUBLISHING
  await db.publication.update({
    where: { id: publicationId },
    data: {
      status: "PUBLISHING",
      lastAttemptAt: new Date(),
      attemptCount: { increment: 1 },
    },
  });

  logInfo("[Publish] Starting publish", {
    publicationId,
    channelType: publication.channel.type,
    isDemo,
    attemptCount: publication.attemptCount + 1,
  });

  try {
    // Call the provider
    const result = await provider.publish({
      channelId: publication.channelId,
      content: {
        title: publication.content.title || undefined,
        body: publication.content.body,
        hashtags: publication.content.suggestedHashtags?.split(" ").filter(Boolean),
      },
      mediaUrl: null, // TODO: Support media attachments
      jobId: publication.jobId,
      publicationId: publication.id,
      agencyId: publication.agencyId,
      isDemo,
    });

    if (result.success) {
      // Update as published
      const updated = await db.publication.update({
        where: { id: publicationId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          externalId: result.externalPostId || null,
          externalUrl: result.externalUrl || null,
          errorMessage: null,
        },
      });

      // Log success event
      await db.eventLog.create({
        data: {
          agencyId,
          userId: userId || null,
          jobId: publication.jobId,
          type: "PUBLICATION_PUBLISHED",
          payload: {
            publicationId,
            channelType: publication.channel.type,
            channelName: publication.channel.name,
            externalUrl: result.externalUrl,
            isDemo,
            isStub: result.isStub,
          },
        },
      });

      logInfo("[Publish] Success", {
        publicationId,
        externalUrl: result.externalUrl,
        isStub: result.isStub,
      });

      return {
        success: true,
        publication: {
          id: updated.id,
          status: "PUBLISHED",
          publishedAt: updated.publishedAt,
          externalUrl: updated.externalUrl,
          externalId: updated.externalId,
        },
        providerResult: result,
      };
    } else {
      // Update as failed
      const updated = await db.publication.update({
        where: { id: publicationId },
        data: {
          status: "FAILED",
          errorMessage: result.errorMessage || "Unknown error",
        },
      });

      // Log failure event
      await db.eventLog.create({
        data: {
          agencyId,
          userId: userId || null,
          jobId: publication.jobId,
          type: "PUBLICATION_FAILED",
          payload: {
            publicationId,
            channelType: publication.channel.type,
            channelName: publication.channel.name,
            errorMessage: result.errorMessage,
            attemptCount: publication.attemptCount + 1,
          },
        },
      });

      logError("[Publish] Failed", {
        publicationId,
        errorMessage: result.errorMessage,
      });

      return {
        success: false,
        publication: {
          id: updated.id,
          status: "FAILED",
          errorMessage: updated.errorMessage,
        },
        providerResult: result,
      };
    }
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db.publication.update({
      where: { id: publicationId },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });

    logError("[Publish] Unexpected error", {
      publicationId,
      error: errorMessage,
    });

    throw error;
  }
}

// =============================================================================
// ERRORS
// =============================================================================

export type PublishErrorCode =
  | "PUBLICATION_NOT_FOUND"
  | "PUBLISHING_IN_PROGRESS"
  | "MAX_ATTEMPTS_REACHED"
  | "NO_PROVIDER"
  | "PROVIDER_ERROR";

export class PublishError extends Error {
  constructor(
    public readonly code: PublishErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PublishError";
  }
}
