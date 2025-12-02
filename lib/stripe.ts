import Stripe from "stripe";
import { ENV } from "@/lib/env";
import { logWarn } from "@/lib/log";

// Warn if Stripe is not configured (but don't fail - it may not be needed in all environments)
if (!ENV.STRIPE_SECRET_KEY && ENV.IS_PRODUCTION) {
  logWarn("STRIPE_SECRET_KEY not configured - billing features will not work");
}

export const stripe = new Stripe(ENV.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-11-17.clover",
  typescript: true,
});

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  return !!ENV.STRIPE_SECRET_KEY;
}

export default stripe;
