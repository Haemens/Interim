/**
 * Plan-based feature gating for QuestHire
 */

import { db } from "@/lib/db";
import { BillingPlan } from "@prisma/client";

export type PlanId = BillingPlan;

export interface PlanFeatures {
  maxActiveJobs: number | null;
  maxChannels: number | null;
  canUseShortlists: boolean;
  canSeeAnalytics: boolean;
  canManageTeam: boolean;
  canUseSocialContent: boolean;
  canUseAiGeneration: boolean;
  canAutoPublish: boolean;
  canUseClientCRM: boolean;
}

export const PLAN_FEATURES: Record<PlanId, PlanFeatures> = {
  STARTER: {
    maxActiveJobs: 10,
    maxChannels: 3,
    canUseShortlists: false,
    canSeeAnalytics: true,
    canManageTeam: true,
    canUseSocialContent: true,
    canUseAiGeneration: false,
    canAutoPublish: false,
    canUseClientCRM: false,
  },
  PRO: {
    maxActiveJobs: null,
    maxChannels: null,
    canUseShortlists: true,
    canSeeAnalytics: true,
    canManageTeam: true,
    canUseSocialContent: true,
    canUseAiGeneration: true,
    canAutoPublish: true,
    canUseClientCRM: true,
  },
  AGENCY_PLUS: {
    maxActiveJobs: null,
    maxChannels: null,
    canUseShortlists: true,
    canSeeAnalytics: true,
    canManageTeam: true,
    canUseSocialContent: true,
    canUseAiGeneration: true,
    canAutoPublish: true,
    canUseClientCRM: true,
  },
};

export const DEFAULT_PLAN: PlanId = "STARTER";

export class PlanLimitError extends Error {
  public feature: string;
  public currentPlan: PlanId;
  public requiredPlan?: PlanId;

  constructor(feature: string, currentPlan: PlanId, requiredPlan?: PlanId) {
    super("Feature " + feature + " is not available on the " + currentPlan + " plan");
    this.name = "PlanLimitError";
    this.feature = feature;
    this.currentPlan = currentPlan;
    this.requiredPlan = requiredPlan;
  }
}

export class JobLimitError extends Error {
  public currentCount: number;
  public maxAllowed: number;
  public currentPlan: PlanId;

  constructor(currentCount: number, maxAllowed: number, currentPlan: PlanId) {
    super("You have reached the maximum of " + maxAllowed + " active jobs on the " + currentPlan + " plan");
    this.name = "JobLimitError";
    this.currentCount = currentCount;
    this.maxAllowed = maxAllowed;
    this.currentPlan = currentPlan;
  }
}

export async function getPlanForAgency(agencyId: string): Promise<PlanId> {
  const subscription = await db.subscription.findFirst({
    where: { agencyId, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
  });
  return subscription?.plan ?? DEFAULT_PLAN;
}

export async function getPlanFeaturesForAgency(agencyId: string): Promise<{ plan: PlanId; features: PlanFeatures }> {
  const plan = await getPlanForAgency(agencyId);
  return { plan, features: PLAN_FEATURES[plan] };
}

/** Boolean feature keys (excludes numeric limits) */
type BooleanFeatureKey = 
  | "canUseShortlists"
  | "canSeeAnalytics"
  | "canManageTeam"
  | "canUseSocialContent"
  | "canUseAiGeneration"
  | "canAutoPublish"
  | "canUseClientCRM";

export async function canUseFeature(agencyId: string, feature: BooleanFeatureKey): Promise<boolean> {
  const { features } = await getPlanFeaturesForAgency(agencyId);
  return features[feature];
}

/** Assertable feature names (user-friendly aliases) */
export type AssertableFeature =
  | "shortlists"
  | "analytics"
  | "team"
  | "socialContent"
  | "aiGeneration"
  | "autoPublish"
  | "clientCRM";

export async function assertFeature(agencyId: string, feature: AssertableFeature): Promise<void> {
  const { plan, features } = await getPlanFeaturesForAgency(agencyId);
  const featureMap: Record<AssertableFeature, BooleanFeatureKey> = {
    shortlists: "canUseShortlists",
    analytics: "canSeeAnalytics",
    team: "canManageTeam",
    socialContent: "canUseSocialContent",
    aiGeneration: "canUseAiGeneration",
    autoPublish: "canAutoPublish",
    clientCRM: "canUseClientCRM",
  };
  const featureKey = featureMap[feature];
  if (!features[featureKey]) {
    throw new PlanLimitError(feature, plan, "PRO");
  }
}

export async function canCreateActiveJob(agencyId: string): Promise<{ allowed: boolean; currentCount: number; maxAllowed: number | null; plan: PlanId }> {
  const { plan, features } = await getPlanFeaturesForAgency(agencyId);
  if (features.maxActiveJobs === null) {
    return { allowed: true, currentCount: 0, maxAllowed: null, plan };
  }
  const currentCount = await db.job.count({ where: { agencyId, status: "ACTIVE" } });
  return { allowed: currentCount < features.maxActiveJobs, currentCount, maxAllowed: features.maxActiveJobs, plan };
}

export async function assertCanCreateActiveJob(agencyId: string): Promise<void> {
  const { allowed, currentCount, maxAllowed, plan } = await canCreateActiveJob(agencyId);
  if (!allowed && maxAllowed !== null) {
    throw new JobLimitError(currentCount, maxAllowed, plan);
  }
}

export function getPlanDisplayName(plan: PlanId): string {
  const names: Record<PlanId, string> = { STARTER: "Starter", PRO: "Pro", AGENCY_PLUS: "Agency Plus" };
  return names[plan];
}
