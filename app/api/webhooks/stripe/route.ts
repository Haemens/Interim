import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/modules/billing";
import { logError, logInfo } from "@/lib/log";

/**
 * POST /api/webhooks/stripe
 * 
 * Handles Stripe webhook events for subscription management.
 * 
 * Configure this endpoint in your Stripe dashboard:
 * https://dashboard.stripe.com/webhooks
 * 
 * Events to subscribe to:
 * - checkout.session.completed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_failed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      logError("Missing Stripe signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    await handleStripeWebhook(body, signature);

    return NextResponse.json({ received: true });
  } catch (error) {
    logError("Stripe webhook error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Return 400 for signature verification errors
    if (error instanceof Error && error.message.includes("signature")) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Return 500 for other errors but still acknowledge receipt
    // This prevents Stripe from retrying indefinitely
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
