/**
 * Feedback Sync Module
 *
 * Handles auto-syncing application status based on client feedback decisions.
 * When a client approves or rejects a candidate on a shortlist, this module
 * can optionally update the underlying Application status.
 *
 * Feature flag: ENABLE_FEEDBACK_SYNC (ENV)
 */

import { db } from "@/lib/db";
import { FEATURES } from "@/lib/env";
import { logInfo, logWarn } from "@/lib/log";
// Note: ApplicationStatus and ClientDecision are Prisma enums
// They will be available after `npx prisma generate`
type ApplicationStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PLACED" | "REJECTED";
type ClientDecision = "PENDING" | "APPROVED" | "REJECTED";

// =============================================================================
// TYPES
// =============================================================================

export interface SyncContext {
  feedbackId: string;
  applicationId: string;
  shortlistId: string;
  shortlistName: string;
  agencyId: string;
  decision: ClientDecision;
  isDemo: boolean;
}

export interface SyncResult {
  synced: boolean;
  previousStatus?: ApplicationStatus;
  newStatus?: ApplicationStatus;
  reason: string;
}

// =============================================================================
// STATUS MAPPING & COMPARISON
// =============================================================================

/**
 * Application status funnel order (lower = earlier in funnel).
 * Used to determine if a status change is a "progression" or "regression".
 */
const STATUS_ORDER: Record<ApplicationStatus, number> = {
  NEW: 0,
  CONTACTED: 1,
  QUALIFIED: 2,
  PLACED: 3,
  REJECTED: -1, // Special: terminal state, can't progress from here
};

/**
 * Map client decision to target application status.
 *
 * APPROVED → QUALIFIED
 *   We use QUALIFIED (not PLACED) because client approval indicates
 *   the candidate is a good fit, but actual placement requires
 *   additional steps (offer, acceptance, start date, etc.)
 *
 * REJECTED → REJECTED
 *   Client rejection maps directly to application rejection.
 *
 * PENDING → no change (not synced)
 */
export function mapDecisionToStatus(decision: ClientDecision): ApplicationStatus | null {
  switch (decision) {
    case "APPROVED":
      return "QUALIFIED";
    case "REJECTED":
      return "REJECTED";
    case "PENDING":
      return null; // No sync for pending
    default:
      return null;
  }
}

/**
 * Determine if a status transition is allowed.
 *
 * Rules:
 * 1. Cannot change status if already PLACED (terminal positive state)
 * 2. Cannot change status if already REJECTED (terminal negative state)
 * 3. Can only "progress" forward in the funnel (NEW → CONTACTED → QUALIFIED)
 * 4. Exception: Can always transition to REJECTED from any non-terminal state
 *
 * @param currentStatus - Current application status
 * @param targetStatus - Desired new status
 * @returns true if transition is allowed
 */
export function isStatusTransitionAllowed(
  currentStatus: ApplicationStatus,
  targetStatus: ApplicationStatus
): boolean {
  // Terminal states: cannot change from PLACED or REJECTED
  if (currentStatus === "PLACED" || currentStatus === "REJECTED") {
    return false;
  }

  // Always allow transition to REJECTED (client rejection overrides)
  if (targetStatus === "REJECTED") {
    return true;
  }

  // For non-rejection transitions, only allow forward progression
  const currentOrder = STATUS_ORDER[currentStatus];
  const targetOrder = STATUS_ORDER[targetStatus];

  // Target must be further in the funnel than current
  return targetOrder > currentOrder;
}

/**
 * Get a human-readable reason for why a transition was blocked.
 */
export function getBlockedTransitionReason(
  currentStatus: ApplicationStatus,
  targetStatus: ApplicationStatus
): string {
  if (currentStatus === "PLACED") {
    return "Cannot change status of a placed candidate";
  }
  if (currentStatus === "REJECTED") {
    return "Cannot change status of a rejected candidate";
  }
  if (STATUS_ORDER[targetStatus] <= STATUS_ORDER[currentStatus]) {
    return `Cannot regress status from ${currentStatus} to ${targetStatus}`;
  }
  return "Unknown reason";
}

// =============================================================================
// MAIN SYNC FUNCTION
// =============================================================================

/**
 * Check if feedback sync is enabled.
 */
export function isFeedbackSyncEnabled(): boolean {
  return FEATURES.feedbackSync;
}

/**
 * Sync application status based on client feedback.
 *
 * This function:
 * 1. Checks if sync is enabled (feature flag)
 * 2. Maps the decision to a target status
 * 3. Validates the transition is allowed
 * 4. Updates the application (unless demo mode)
 * 5. Logs an event
 *
 * @param ctx - Sync context with feedback and application details
 * @returns Result indicating if sync occurred and why
 */
export async function syncApplicationStatusFromFeedback(
  ctx: SyncContext
): Promise<SyncResult> {
  const { feedbackId, applicationId, shortlistId, shortlistName, agencyId, decision, isDemo } = ctx;

  // Check feature flag
  if (!isFeedbackSyncEnabled()) {
    logInfo("[FeedbackSync] Sync disabled by feature flag", { applicationId, decision });
    return {
      synced: false,
      reason: "Feedback sync is disabled (ENABLE_FEEDBACK_SYNC=false)",
    };
  }

  // Map decision to target status
  const targetStatus = mapDecisionToStatus(decision);
  if (!targetStatus) {
    logInfo("[FeedbackSync] No status mapping for decision", { applicationId, decision });
    return {
      synced: false,
      reason: `No status mapping for decision: ${decision}`,
    };
  }

  // Load current application status
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true, agencyId: true },
  });

  if (!application) {
    logWarn("[FeedbackSync] Application not found", { applicationId });
    return {
      synced: false,
      reason: "Application not found",
    };
  }

  // Verify tenant isolation
  if (application.agencyId !== agencyId) {
    logWarn("[FeedbackSync] Agency mismatch", {
      applicationId,
      applicationAgencyId: application.agencyId,
      feedbackAgencyId: agencyId,
    });
    return {
      synced: false,
      reason: "Agency mismatch - tenant isolation violation",
    };
  }

  const currentStatus = application.status;

  // Check if transition is allowed
  if (!isStatusTransitionAllowed(currentStatus, targetStatus)) {
    const reason = getBlockedTransitionReason(currentStatus, targetStatus);
    logInfo("[FeedbackSync] Transition blocked", {
      applicationId,
      currentStatus,
      targetStatus,
      reason,
    });
    return {
      synced: false,
      previousStatus: currentStatus,
      reason,
    };
  }

  // Demo mode: don't actually update, but pretend success
  if (isDemo) {
    logInfo("[FeedbackSync] Demo mode - skipping actual update", {
      applicationId,
      currentStatus,
      targetStatus,
    });
    return {
      synced: false,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      reason: "Demo mode - status update simulated but not persisted",
    };
  }

  // Perform the update
  const now = new Date();
  const syncNote = `Status auto-updated from client feedback on shortlist "${shortlistName}" at ${now.toISOString()}`;

  // First, get current note to append
  const currentApp = await db.application.findUnique({
    where: { id: applicationId },
    select: { note: true },
  });

  const updatedNote = currentApp?.note
    ? `${currentApp.note}\n\n${syncNote}`
    : syncNote;

  await db.application.update({
    where: { id: applicationId },
    data: {
      status: targetStatus,
      note: updatedNote,
    },
  });

  // Log event
  await db.eventLog.create({
    data: {
      agencyId,
      type: "APPLICATION_STATUS_SYNCED_FROM_FEEDBACK",
      payload: {
        applicationId,
        previousStatus: currentStatus,
        newStatus: targetStatus,
        shortlistId,
        shortlistName,
        clientFeedbackId: feedbackId,
        decision,
      },
    },
  });

  logInfo("[FeedbackSync] Status synced successfully", {
    applicationId,
    previousStatus: currentStatus,
    newStatus: targetStatus,
    shortlistId,
  });

  return {
    synced: true,
    previousStatus: currentStatus,
    newStatus: targetStatus,
    reason: "Status updated successfully",
  };
}
