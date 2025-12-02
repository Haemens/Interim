"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface PlanInfo {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

const PLANS: PlanInfo[] = [
  {
    id: "STARTER",
    name: "Starter",
    price: "Free",
    description: "For small agencies getting started",
    features: [
      "Up to 10 active jobs",
      "Unlimited applications",
      "Basic analytics",
      "Team management",
      "Email notifications",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "$79/mo",
    description: "For growing agencies",
    features: [
      "Unlimited active jobs",
      "Unlimited applications",
      "Advanced analytics",
      "Team management",
      "Shortlists & client sharing",
      "Candidate talent pool",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "AGENCY_PLUS",
    name: "Agency Plus",
    price: "$199/mo",
    description: "For large agencies with advanced needs",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Custom branding",
      "API access",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
];

function BillingContent() {
  const searchParams = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState<string>("STARTER");
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for success/cancel from Stripe
    if (searchParams.get("success") === "true") {
      const plan = searchParams.get("plan");
      setSuccessMessage(`Successfully upgraded to ${plan || "new plan"}!`);
    } else if (searchParams.get("canceled") === "true") {
      setError("Checkout was canceled. No changes were made.");
    }

    // Fetch current plan
    fetchCurrentPlan();
  }, [searchParams]);

  async function fetchCurrentPlan() {
    try {
      const res = await fetch("/api/analytics/summary");
      if (res.ok) {
        // The analytics API returns plan info
        // For now, we'll use a simpler approach
      }
    } catch (err) {
      // Ignore errors, default to STARTER
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(planId: string) {
    if (planId === "STARTER" || planId === currentPlan) return;

    setUpgrading(planId);
    setError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlan: planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setUpgrading(null);
    }
  }

  async function handleManageBilling() {
    setError(null);

    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Plans</h1>
        <p className="text-slate-600 mt-1">
          Manage your subscription and billing settings.
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
            <p className="text-slate-600">
              You are currently on the{" "}
              <span className="font-medium text-indigo-600">
                {PLANS.find((p) => p.id === currentPlan)?.name || "Starter"}
              </span>{" "}
              plan.
            </p>
          </div>
          {currentPlan !== "STARTER" && (
            <button
              onClick={handleManageBilling}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Manage Billing
            </button>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl border-2 p-6 ${
              plan.highlighted
                ? "border-indigo-500 ring-2 ring-indigo-100"
                : "border-slate-200"
            }`}
          >
            {plan.highlighted && (
              <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-2">
                Most Popular
              </div>
            )}
            <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{plan.description}</p>

            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-slate-600">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {plan.id === currentPlan ? (
                <button
                  disabled
                  className="w-full py-2 px-4 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : plan.id === "STARTER" ? (
                <button
                  disabled
                  className="w-full py-2 px-4 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg cursor-not-allowed"
                >
                  Free Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgrading !== null}
                  className={`w-full py-2 px-4 text-sm font-medium rounded-lg ${
                    plan.highlighted
                      ? "text-white bg-indigo-600 hover:bg-indigo-700"
                      : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {upgrading === plan.id ? "Redirecting..." : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-slate-900">Can I cancel anytime?</h3>
            <p className="text-sm text-slate-600 mt-1">
              Yes, you can cancel your subscription at any time. You&apos;ll continue to
              have access until the end of your billing period.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">What happens when I upgrade?</h3>
            <p className="text-sm text-slate-600 mt-1">
              You&apos;ll immediately get access to all features of your new plan.
              We&apos;ll prorate the cost based on your current billing cycle.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Do you offer refunds?</h3>
            <p className="text-sm text-slate-600 mt-1">
              We offer a 14-day money-back guarantee on all paid plans. Contact
              support if you&apos;re not satisfied.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">Loading billing information...</div>
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
