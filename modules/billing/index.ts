/**
 * Billing module - handles Stripe subscriptions and payments
 */

export const BILLING_MODULE = "billing";

// Plan features and gating
export {
  PLAN_FEATURES,
  DEFAULT_PLAN,
  getPlanForAgency,
  getPlanFeaturesForAgency,
  canUseFeature,
  assertFeature,
  canCreateActiveJob,
  assertCanCreateActiveJob,
  getPlanDisplayName,
  PlanLimitError,
  JobLimitError,
  type PlanId,
  type PlanFeatures,
} from "./plan-features";

// Stripe integration
export {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  handleStripeWebhook,
  stripe,
} from "./stripe";
