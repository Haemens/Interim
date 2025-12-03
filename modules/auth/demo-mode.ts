/**
 * Demo Mode Utilities
 * 
 * Helpers for managing the demo agency and read-only restrictions.
 * 
 * The demo agency allows prospects to explore QuestHire without signing up.
 * All write operations are blocked to prevent data pollution.
 * 
 * Usage:
 * - Call `assertNotDemoAgency(agency, "action description")` before any write operation
 * - The function throws `DemoReadOnlyError` if the agency is the demo agency
 * - Error handlers should catch this and return a 403 with code "DEMO_READ_ONLY"
 */

// Agency type from Prisma - using inline type to avoid import issues
import { ApiError } from "@/lib/api-error";

// =============================================================================
// CONSTANTS
// =============================================================================

/** The slug used for the demo agency */
export const DEMO_AGENCY_SLUG = "demo-agency";

/** 
 * Environment variable to disable demo mode restrictions for local development.
 * Set DISABLE_DEMO_MODE=true in .env.local to allow mutations on demo-agency.
 */
const DEMO_MODE_DISABLED = process.env.DISABLE_DEMO_MODE === "true";

/** The email used for the demo user */
export const DEMO_USER_EMAIL = "demo@questhire.com";

// =============================================================================
// TYPE GUARDS
// =============================================================================

/** Minimal agency shape for demo checks */
type AgencyLike = { slug: string };

/**
 * Check if an agency is the demo agency
 * @param agency - Agency object or any object with a slug property
 * @returns true if this is the demo agency
 */
export function isDemoAgency(agency: AgencyLike | null | undefined): boolean {
  if (DEMO_MODE_DISABLED) return false;
  return agency?.slug === DEMO_AGENCY_SLUG;
}

/**
 * Check if a slug is the demo agency slug
 * @param slug - Agency slug to check
 * @returns true if this is the demo agency slug
 */
export function isDemoAgencySlug(slug: string | null | undefined): boolean {
  if (DEMO_MODE_DISABLED) return false;
  return slug === DEMO_AGENCY_SLUG;
}

/**
 * Check if a user email is the demo user
 * @param email - User email to check
 * @returns true if this is the demo user email
 */
export function isDemoUser(email: string | null | undefined): boolean {
  return email === DEMO_USER_EMAIL;
}

// =============================================================================
// ERRORS
// =============================================================================

/**
 * Error thrown when attempting a write operation in demo mode
 * 
 * HTTP Status: 403
 * Error Code: DEMO_READ_ONLY
 */
export class DemoReadOnlyError extends ApiError {
  constructor(message = "This action is not available in demo mode") {
    super("FORBIDDEN", message, 403, { code: "DEMO_READ_ONLY" });
    this.name = "DemoReadOnlyError";
  }
}

// =============================================================================
// ASSERTIONS
// =============================================================================

/**
 * Throw an error if the agency is the demo agency.
 * Use this to protect write operations in API routes.
 * 
 * @param agency - Agency object to check
 * @param action - Description of the action being attempted (for error message)
 * @throws DemoReadOnlyError if the agency is the demo agency
 * 
 * @example
 * ```ts
 * // In an API route handler:
 * const { agency } = await getCurrentMembershipOrThrow(tenantSlug);
 * assertNotDemoAgency(agency, "create jobs");
 * // ... proceed with job creation
 * ```
 */
export function assertNotDemoAgency(
  agency: AgencyLike | null | undefined,
  action = "perform this action"
): void {
  if (isDemoAgency(agency)) {
    throw new DemoReadOnlyError(
      `Cannot ${action} in demo mode. Sign up for a free trial to get started!`
    );
  }
}

/**
 * Check if an operation should be blocked in demo mode.
 * Returns true if the operation should proceed, false if blocked.
 * 
 * @param agency - Agency object to check
 * @returns true if mutations are allowed, false if in demo mode
 */
export function canMutateInDemoMode(
  agency: AgencyLike | null | undefined
): boolean {
  return !isDemoAgency(agency);
}
