/**
 * GDPR Module
 * 
 * Provides utilities for GDPR compliance including:
 * - Data anonymization (implemented)
 * - Hard delete (placeholder for future implementation)
 * 
 * Current approach: Anonymization via POST /api/applications/[id]/anonymize
 * Future enhancement: Hard delete via delete-helpers.ts
 */

export {
  HardDeleteNotImplementedError,
  hardDeleteApplication,
  hardDeleteCandidate,
  bulkDeleteOldApplications,
} from "./delete-helpers";
