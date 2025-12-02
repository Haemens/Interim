/**
 * Application-wide constants
 */

export const APP_NAME = "QuestHire";
export const APP_DESCRIPTION = "Multi-tenant SaaS platform for staffing agencies";

export const ROUTES = {
  // Public routes
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  PRICING: "/pricing",

  // App routes
  DASHBOARD: "/dashboard",
  JOBS: "/dashboard/jobs",
  CANDIDATES: "/dashboard/candidates",
  ANALYTICS: "/dashboard/analytics",
  SETTINGS: "/dashboard/settings",
  BILLING: "/dashboard/settings/billing",
  TEAM: "/dashboard/settings/team",
} as const;

export const USER_ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type UserRoleType = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ROLE_PERMISSIONS = {
  [USER_ROLES.OWNER]: ["*"], // All permissions
  [USER_ROLES.ADMIN]: [
    "jobs:read",
    "jobs:write",
    "jobs:delete",
    "candidates:read",
    "candidates:write",
    "analytics:read",
    "team:read",
    "team:write",
    "settings:read",
    "settings:write",
  ],
  [USER_ROLES.MEMBER]: [
    "jobs:read",
    "jobs:write",
    "candidates:read",
    "candidates:write",
    "analytics:read",
  ],
} as const;
