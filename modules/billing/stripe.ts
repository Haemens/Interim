/**
 * Stripe integration helpers for QuestHire billing
 */

import Stripe from "stripe";
import { db } from "@/lib/db";
import { logInfo, logError, logWarn } from "@/lib/log";
import { captureException } from "@/lib/monitoring";
import type { Agency, BillingPlan } from "@prisma/client";

// =============================================================================
// STRIPE CLIENT
// =============================================================================

// Only initialize Stripe if we have a secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function getStripeClient(): Stripe {
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Please add it to your environment variables.");
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: "2025-11-17.clover",
  });
}

// Lazy-loaded stripe instance
let _stripe: Stripe | null = null;
const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!_stripe) {
      _stripe = getStripeClient();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_stripe as any)[prop];
  },
});

// =============================================================================
// PRICE IDS (Configure these in your Stripe dashboard)
// =============================================================================

const STRIPE_PRICE_IDS: Record<BillingPlan, string | null> = {
  STARTER: null, // Free plan, no Stripe price
  PRO: process.env.STRIPE_PRICE_PRO || "price_pro_placeholder",
  AGENCY_PLUS: process.env.STRIPE_PRICE_AGENCY_PLUS || "price_agency_plus_placeholder",
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get or create a Stripe customer for an agency
 */
export async function getOrCreateStripeCustomer(agency: Agency): Promise<string> {
  // Check if agency already has a Stripe customer
  const subscription = await db.subscription.findFirst({
    where: { agencyId: agency.id },
    select: { stripeCustomerId: true },
  });

  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: agency.email || undefined,
    name: agency.name,
    metadata: {
      agencyId: agency.id,
      agencySlug: agency.slug,
    },
  });

  logInfo("Created Stripe customer", {
    agencyId: agency.id,
    customerId: customer.id,
  });

  // Update subscription with customer ID
  await db.subscription.updateMany({
    where: { agencyId: agency.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout session for upgrading to a plan
 */
export async function createCheckoutSession(
  agencyId: string,
  targetPlan: BillingPlan,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const agency = await db.agency.findUnique({
    where: { id: agencyId },
  });

  if (!agency) {
    throw new Error("Agency not found");
  }

  const priceId = STRIPE_PRICE_IDS[targetPlan];
  if (!priceId) {
    throw new Error(`No price configured for plan: ${targetPlan}`);
  }

  const customerId = await getOrCreateStripeCustomer(agency);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      agencyId: agency.id,
      targetPlan,
    },
    subscription_data: {
      metadata: {
        agencyId: agency.id,
        targetPlan,
      },
    },
  });

  logInfo("Created Stripe checkout session", {
    agencyId: agency.id,
    sessionId: session.id,
    targetPlan,
  });

  return session.url || "";
}

/**
 * Create a Stripe Customer Portal session for managing billing
 */
export async function createPortalSession(
  agencyId: string,
  returnUrl: string
): Promise<string> {
  const agency = await db.agency.findUnique({
    where: { id: agencyId },
  });

  if (!agency) {
    throw new Error("Agency not found");
  }

  const customerId = await getOrCreateStripeCustomer(agency);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  logInfo("Created Stripe portal session", {
    agencyId: agency.id,
    sessionId: session.id,
  });

  return session.url;
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  body: string,
  signature: string
): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Stripe webhook secret not configured");
  }

  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  logInfo("Received Stripe webhook", { type: event.type });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }

    default:
      logInfo("Unhandled Stripe event", { type: event.type });
  }
}

// =============================================================================
// WEBHOOK HANDLERS
// =============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const agencyId = session.metadata?.agencyId;
  const targetPlan = session.metadata?.targetPlan as BillingPlan | undefined;

  if (!agencyId || !targetPlan) {
    logError("Missing metadata in checkout session", { sessionId: session.id });
    captureException(new Error("Missing metadata in checkout session"), {
      route: "stripe-webhook",
      errorCode: "CHECKOUT_MISSING_METADATA",
    });
    return;
  }

  try {
    await db.subscription.updateMany({
      where: { agencyId },
      data: {
        plan: targetPlan,
        status: "ACTIVE",
        stripeSubId: session.subscription as string,
      },
    });

    logInfo("Subscription upgraded via checkout", {
      agencyId,
      plan: targetPlan,
      sessionId: session.id,
      subscriptionId: session.subscription,
    });
  } catch (error) {
    logError("Failed to update subscription after checkout", {
      agencyId,
      plan: targetPlan,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    captureException(error, {
      route: "stripe-webhook",
      errorCode: "CHECKOUT_UPDATE_FAILED",
      agencyId,
    });
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const agencyId = subscription.metadata?.agencyId;

  if (!agencyId) {
    logError("Missing agencyId in subscription metadata", {
      subscriptionId: subscription.id,
    });
    return;
  }

  // Map Stripe status to our status
  let status: "ACTIVE" | "PAST_DUE" | "CANCELED" = "ACTIVE";
  if (subscription.status === "past_due") {
    status = "PAST_DUE";
  } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
    status = "CANCELED";
  }

  await db.subscription.updateMany({
    where: { agencyId },
    data: { status },
  });

  logInfo("Subscription status updated", {
    agencyId,
    status,
    stripeStatus: subscription.status,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const agencyId = subscription.metadata?.agencyId;

  if (!agencyId) {
    return;
  }

  // Downgrade to STARTER when subscription is deleted
  await db.subscription.updateMany({
    where: { agencyId },
    data: {
      plan: "STARTER",
      status: "ACTIVE",
      stripeSubId: null,
    },
  });

  logInfo("Subscription canceled, downgraded to STARTER", { agencyId });
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  // Find agency by customer ID
  const subscription = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { agencyId: true },
  });

  if (subscription) {
    await db.subscription.updateMany({
      where: { agencyId: subscription.agencyId },
      data: { status: "PAST_DUE" },
    });

    logWarn("Payment failed, subscription marked as past due", {
      agencyId: subscription.agencyId,
      invoiceId: invoice.id,
      amountDue: invoice.amount_due,
      currency: invoice.currency,
    });

    // Capture for monitoring - payment failures are important
    captureException(new Error("Stripe payment failed"), {
      route: "stripe-webhook",
      errorCode: "PAYMENT_FAILED",
      agencyId: subscription.agencyId,
    });
  } else {
    logError("Payment failed but no subscription found for customer", {
      customerId,
      invoiceId: invoice.id,
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { stripe };
