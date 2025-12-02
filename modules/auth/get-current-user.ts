import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Agency, Membership, MembershipRole, User } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface MembershipContext {
  user: User;
  membership: Membership;
  agency: Agency;
}

/**
 * Error thrown when user is not authenticated
 */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Error thrown when user doesn't have required role
 */
export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Error thrown when membership is not found
 */
export class MembershipNotFoundError extends Error {
  constructor(userId: string, agencySlug: string) {
    super(`User ${userId} is not a member of agency ${agencySlug}`);
    this.name = "MembershipNotFoundError";
  }
}

// =============================================================================
// SESSION HELPERS
// =============================================================================

/**
 * Get the current authenticated user from the session
 * For use in Server Components and Route Handlers
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  };
}

/**
 * Get the current session
 * For use in Server Components and Route Handlers
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return !!session?.user;
}

/**
 * Require authentication - throws if not authenticated
 * For use in protected routes
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

// =============================================================================
// MEMBERSHIP HELPERS
// =============================================================================

/**
 * Get full user record from database by session
 */
export async function getCurrentUserFromDb(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return db.user.findUnique({
    where: { email: session.user.email },
  });
}

/**
 * Get current user's membership for a specific agency
 * Returns { user, membership, agency } or throws
 */
export async function getCurrentMembershipOrThrow(
  tenantSlug: string
): Promise<MembershipContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    throw new UnauthorizedError();
  }

  // Get user with membership for this agency
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        where: {
          agency: { slug: tenantSlug },
        },
        include: {
          agency: true,
        },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  const membership = user.memberships[0];
  if (!membership) {
    throw new MembershipNotFoundError(user.id, tenantSlug);
  }

  return {
    user,
    membership,
    agency: membership.agency,
  };
}

/**
 * Get membership context from request (for API routes)
 * Combines tenant resolution with membership lookup
 */
export async function getMembershipFromRequest(
  tenantSlug: string | null
): Promise<MembershipContext> {
  if (!tenantSlug) {
    throw new UnauthorizedError("Tenant slug required");
  }

  return getCurrentMembershipOrThrow(tenantSlug);
}

// =============================================================================
// ROLE HELPERS
// =============================================================================

/**
 * Role hierarchy (higher index = more permissions)
 */
const ROLE_HIERARCHY: MembershipRole[] = ["VIEWER", "RECRUITER", "ADMIN", "OWNER"];

/**
 * Check if a role has at least the required permission level
 */
export function hasMinimumRole(
  userRole: MembershipRole,
  requiredRole: MembershipRole
): boolean {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Assert that membership has one of the allowed roles
 * Throws ForbiddenError if not
 */
export function assertRole(
  membership: Membership,
  allowedRoles: MembershipRole[]
): void {
  if (!allowedRoles.includes(membership.role)) {
    throw new ForbiddenError(
      `Role ${membership.role} is not allowed. Required: ${allowedRoles.join(", ")}`
    );
  }
}

/**
 * Assert that membership has at least the minimum role
 * Throws ForbiddenError if not
 */
export function assertMinimumRole(
  membership: Membership,
  minimumRole: MembershipRole
): void {
  if (!hasMinimumRole(membership.role, minimumRole)) {
    throw new ForbiddenError(
      `Role ${membership.role} does not have sufficient permissions. Required: ${minimumRole} or higher`
    );
  }
}

/**
 * Check if user can read (VIEWER and above)
 */
export function canRead(membership: Membership): boolean {
  return hasMinimumRole(membership.role, "VIEWER");
}

/**
 * Check if user can write (RECRUITER and above)
 */
export function canWrite(membership: Membership): boolean {
  return hasMinimumRole(membership.role, "RECRUITER");
}

/**
 * Check if user can manage (ADMIN and above)
 */
export function canManage(membership: Membership): boolean {
  return hasMinimumRole(membership.role, "ADMIN");
}

/**
 * Check if user is owner
 */
export function isOwner(membership: Membership): boolean {
  return membership.role === "OWNER";
}
