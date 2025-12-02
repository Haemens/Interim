/**
 * Billing plan configuration for QuestHire
 */

export const PLANS = {
  STARTER: "STARTER",
  PRO: "PRO",
  AGENCY_PLUS: "AGENCY_PLUS",
} as const;

export type PlanType = (typeof PLANS)[keyof typeof PLANS];

export interface PlanConfig {
  name: string;
  description: string;
  price: number; // Monthly price in cents
  features: string[];
  limits: {
    jobs: number;
    users: number;
    applications: number;
  };
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  [PLANS.STARTER]: {
    name: "Starter",
    description: "Perfect for small agencies just getting started",
    price: 2900, // $29/month
    features: [
      "Up to 5 active job postings",
      "Up to 3 team members",
      "Basic analytics",
      "Email support",
    ],
    limits: {
      jobs: 5,
      users: 3,
      applications: 100,
    },
  },
  [PLANS.PRO]: {
    name: "Pro",
    description: "For growing agencies with more hiring needs",
    price: 7900, // $79/month
    features: [
      "Up to 25 active job postings",
      "Up to 10 team members",
      "Advanced analytics",
      "Priority email support",
      "Custom branding",
    ],
    limits: {
      jobs: 25,
      users: 10,
      applications: 500,
    },
  },
  [PLANS.AGENCY_PLUS]: {
    name: "Agency Plus",
    description: "Enterprise-grade features for large agencies",
    price: 19900, // $199/month
    features: [
      "Unlimited job postings",
      "Unlimited team members",
      "Full analytics suite",
      "Dedicated support",
      "Custom branding",
      "API access",
      "SSO integration",
    ],
    limits: {
      jobs: -1, // Unlimited
      users: -1,
      applications: -1,
    },
  },
};

export function getPlanConfig(plan: PlanType): PlanConfig {
  return PLAN_CONFIGS[plan];
}

export function isWithinPlanLimits(
  plan: PlanType,
  resource: keyof PlanConfig["limits"],
  currentCount: number
): boolean {
  const limit = PLAN_CONFIGS[plan].limits[resource];
  return limit === -1 || currentCount < limit;
}
