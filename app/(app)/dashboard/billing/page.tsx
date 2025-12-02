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
    price: "Gratuit",
    description: "Pour les petites agences qui débutent",
    features: [
      "Jusqu'à 10 offres actives",
      "Candidatures illimitées",
      "Statistiques basiques",
      "Gestion d'équipe",
      "Notifications email",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "79€/mois",
    description: "Pour les agences en croissance",
    features: [
      "Offres actives illimitées",
      "Candidatures illimitées",
      "Statistiques avancées",
      "Gestion d'équipe",
      "Shortlists & partage client",
      "Vivier de talents",
      "Support prioritaire",
    ],
    highlighted: true,
  },
  {
    id: "AGENCY_PLUS",
    name: "Agency Plus",
    price: "199€/mois",
    description: "Pour les grandes agences",
    features: [
      "Tout ce qu'il y a dans Pro",
      "Membres d'équipe illimités",
      "Marque blanche",
      "Accès API",
      "Support dédié",
      "Garantie SLA",
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
      setSuccessMessage(`Passage au forfait ${plan || "supérieur"} réussi !`);
    } else if (searchParams.get("canceled") === "true") {
      setError("Paiement annulé. Aucun changement n'a été effectué.");
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
      // Try to get tenant slug from hostname or cookies logic in the backend
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlan: planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Impossible de créer la session de paiement");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
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
        throw new Error(data.error || "Impossible d'ouvrir le portail de facturation");
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Facturation et Forfaits</h1>
        <p className="text-slate-600 mt-1">
          Gérez votre abonnement et vos informations de paiement.
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
            <h2 className="text-lg font-semibold text-slate-900">Forfait actuel</h2>
            <p className="text-slate-600">
              Vous êtes actuellement sur le forfait{" "}
              <span className="font-medium text-indigo-600">
                {PLANS.find((p) => p.id === currentPlan)?.name || "Starter"}
              </span>.
            </p>
          </div>
          {currentPlan !== "STARTER" && (
            <button
              onClick={handleManageBilling}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Gérer l&apos;abonnement
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
                Le plus populaire
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
                  Forfait actuel
                </button>
              ) : plan.id === "STARTER" ? (
                <button
                  disabled
                  className="w-full py-2 px-4 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg cursor-not-allowed"
                >
                  Forfait gratuit
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
                  {upgrading === plan.id ? "Redirection..." : `Passer à ${plan.name}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Questions Fréquentes
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-slate-900">Puis-je annuler à tout moment ?</h3>
            <p className="text-sm text-slate-600 mt-1">
              Oui, vous pouvez annuler votre abonnement à tout moment. Vous continuerez à
              avoir accès jusqu&apos;à la fin de votre période de facturation.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Que se passe-t-il si je change de forfait ?</h3>
            <p className="text-sm text-slate-600 mt-1">
              Vous aurez immédiatement accès à toutes les fonctionnalités de votre nouveau forfait.
              Le coût sera calculé au prorata de votre cycle de facturation actuel.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Proposez-vous des remboursements ?</h3>
            <p className="text-sm text-slate-600 mt-1">
              Nous offrons une garantie satisfait ou remboursé de 14 jours sur tous les plans payants. 
              Contactez le support si vous n&apos;êtes pas satisfait.
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
          <div className="text-slate-500">Chargement des informations...</div>
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
