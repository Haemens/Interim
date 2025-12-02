/**
 * GDPR Hard Delete Helpers
 * 
 * These helpers are placeholders for future implementation of hard delete
 * functionality to support GDPR "right to erasure" requests.
 * 
 * CURRENT STATUS: Not implemented
 * 
 * DIFFERENCE FROM ANONYMIZATION:
 * - Anonymization (current): Replaces PII with placeholder values, keeps record
 *   for statistical/audit purposes. Application record remains with "Anonymized" name.
 * - Hard Delete (future): Completely removes all records and associated data
 *   from the database, including cascade deletion of related records.
 * 
 * IMPLEMENTATION NOTES:
 * When implementing hard delete, consider:
 * 1. Cascade deletion order (shortlist items → applications → candidate profiles)
 * 2. File storage cleanup (CV files in S3/R2)
 * 3. Event log handling (anonymize references or delete)
 * 4. Audit trail requirements (may need to log deletion event before deleting)
 * 5. Data retention policies per jurisdiction
 * 
 * @see POST /api/applications/[id]/anonymize for current soft-delete approach
 */

import { db } from "@/lib/db";
import { logInfo, logWarn } from "@/lib/log";

// =============================================================================
// ERRORS
// =============================================================================

export class HardDeleteNotImplementedError extends Error {
  constructor(entityType: string) {
    super(`Hard delete for ${entityType} is not yet implemented. Use anonymization instead.`);
    this.name = "HardDeleteNotImplementedError";
  }
}

// =============================================================================
// APPLICATION HARD DELETE
// =============================================================================

/**
 * Hard delete an application and all associated data.
 * 
 * This will:
 * - Remove the application from all shortlists
 * - Delete the application record
 * - Optionally delete associated CV file from storage
 * 
 * @param applicationId - The ID of the application to delete
 * @param agencyId - The agency ID (for tenant isolation verification)
 * @throws HardDeleteNotImplementedError - Currently not implemented
 * 
 * @example
 * ```ts
 * // Future usage:
 * await hardDeleteApplication(applicationId, agencyId);
 * ```
 */
export async function hardDeleteApplication(
  applicationId: string,
  agencyId: string
): Promise<void> {
  // Verify application exists and belongs to agency
  const application = await db.application.findFirst({
    where: {
      id: applicationId,
      agencyId,
    },
  });

  if (!application) {
    logWarn("Hard delete attempted on non-existent application", {
      applicationId,
      agencyId,
    });
    return;
  }

  // TODO: Implement full cascade delete
  // 1. Delete from shortlist items
  // 2. Delete CV file from storage if exists
  // 3. Delete application record
  // 4. Log deletion event

  logInfo("Hard delete requested but not implemented", {
    entityType: "application",
    applicationId,
    agencyId,
  });

  throw new HardDeleteNotImplementedError("application");
}

// =============================================================================
// CANDIDATE PROFILE HARD DELETE
// =============================================================================

/**
 * Hard delete a candidate profile and all associated data.
 * 
 * This will:
 * - Delete all applications linked to this candidate
 * - Remove candidate from all shortlists
 * - Delete all CV files from storage
 * - Delete the candidate profile record
 * 
 * @param candidateId - The ID of the candidate profile to delete
 * @param agencyId - The agency ID (for tenant isolation verification)
 * @throws HardDeleteNotImplementedError - Currently not implemented
 * 
 * @example
 * ```ts
 * // Future usage:
 * await hardDeleteCandidate(candidateId, agencyId);
 * ```
 */
export async function hardDeleteCandidate(
  candidateId: string,
  agencyId: string
): Promise<void> {
  // Verify candidate exists and belongs to agency
  const candidate = await db.candidateProfile.findFirst({
    where: {
      id: candidateId,
      agencyId,
    },
  });

  if (!candidate) {
    logWarn("Hard delete attempted on non-existent candidate", {
      candidateId,
      agencyId,
    });
    return;
  }

  // TODO: Implement full cascade delete
  // 1. Get all applications for this candidate
  // 2. Delete from shortlist items for each application
  // 3. Delete CV files from storage
  // 4. Delete all applications
  // 5. Delete candidate profile
  // 6. Log deletion event

  logInfo("Hard delete requested but not implemented", {
    entityType: "candidate",
    candidateId,
    agencyId,
  });

  throw new HardDeleteNotImplementedError("candidate");
}

// =============================================================================
// BULK DELETE HELPERS (FUTURE)
// =============================================================================

/**
 * Placeholder for bulk deletion of old/inactive data.
 * Could be used for automated data retention policy enforcement.
 * 
 * @param agencyId - The agency ID
 * @param olderThanDays - Delete records older than this many days
 * @throws HardDeleteNotImplementedError - Currently not implemented
 */
export async function bulkDeleteOldApplications(
  agencyId: string,
  olderThanDays: number
): Promise<{ deletedCount: number }> {
  logInfo("Bulk delete requested but not implemented", {
    agencyId,
    olderThanDays,
  });

  throw new HardDeleteNotImplementedError("bulk applications");
}
