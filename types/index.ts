/**
 * Shared TypeScript types for QuestHire
 */

// Re-export Prisma types for convenience
export type {
  User,
  Agency,
  Membership,
  MembershipRole,
  Job,
  JobAsset,
  JobAssetType,
  Application,
  Subscription,
  EventLog,
  Shortlist,
  ShortlistItem,
  CandidateProfile,
  CandidateStatus,
  BillingPlan,
  JobStatus,
  ApplicationStatus,
  SubscriptionStatus,
} from "@prisma/client";

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Tenant context
export interface TenantContext {
  slug: string | null;
  agencyId?: string;
  agencyName?: string;
}

// Dashboard navigation
export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  disabled?: boolean;
  external?: boolean;
  badge?: string;
}

// Form states
export type FormState = "idle" | "loading" | "success" | "error";
