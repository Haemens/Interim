"use client";

import { useState, useCallback, useEffect } from "react";

// =============================================================================
// TYPES
// =============================================================================

export type OnboardingStep =
  | "welcome"
  | "create-job"
  | "jobs"
  | "candidates"
  | "analytics"
  | "billing"
  | "done";

export interface OnboardingStepInfo {
  id: OnboardingStep;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
}

export const ONBOARDING_STEPS: OnboardingStepInfo[] = [
  {
    id: "welcome",
    title: "Bienvenue sur Interim ! 👋",
    description:
      "Faisons un tour rapide pour vous aider à démarrer. Vous apprendrez à créer des offres, gérer vos candidats et suivre vos recrutements.",
  },
  {
    id: "create-job",
    title: "Créez votre première offre",
    description:
      "Commencez par publier une offre d'emploi via ce bouton. C'est le point de départ pour recevoir des candidatures.",
    target: '[data-tour="create-job"]',
  },
  {
    id: "jobs",
    title: "Gérez vos recrutements",
    description:
      "Retrouvez toutes vos offres ici. Cliquez sur une offre pour accéder à son tableau de suivi (pipeline Kanban) et gérer les étapes de recrutement.",
    target: '[data-tour="jobs"]',
  },
  {
    id: "candidates",
    title: "Votre vivier de talents",
    description:
      "Tous les candidats sont automatiquement ajoutés à votre vivier. Retrouvez-les facilement ici pour vos futurs besoins.",
    target: '[data-tour="candidates"]',
  },
  {
    id: "analytics",
    title: "Suivez vos performances",
    description:
      "Visualisez en temps réel vos statistiques de recrutement, l'efficacité de vos sources et l'activité de votre équipe.",
    target: '[data-tour="analytics"]',
  },
  {
    id: "billing",
    title: "Abonnement & Équipe",
    description:
      "Gérez votre abonnement, changez de forfait ou invitez vos collaborateurs depuis cet onglet.",
    target: '[data-tour="billing"]',
  },
];

// =============================================================================
// HOOK
// =============================================================================

interface UseOnboardingTourOptions {
  autoStart?: boolean;
}

interface UseOnboardingTourReturn {
  isLoading: boolean;
  hasSeenTour: boolean | null;
  currentStep: OnboardingStep | null;
  currentStepInfo: OnboardingStepInfo | null;
  currentStepIndex: number;
  totalSteps: number;
  isActive: boolean;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => Promise<void>;
}

export function useOnboardingTour(
  options: UseOnboardingTourOptions = {}
): UseOnboardingTourReturn {
  const { autoStart = true } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenTour, setHasSeenTour] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null);

  // Fetch initial state
  useEffect(() => {
    async function fetchState() {
      try {
        const res = await fetch("/api/onboarding/state");
        if (res.ok) {
          const data = await res.json();
          setHasSeenTour(data.hasSeenTour);
          
          // Check for force tour param
          const params = new URLSearchParams(window.location.search);
          const forceTour = params.get("tour") === "true";
          
          // Auto-start tour for new users or if forced
          if (autoStart && (!data.hasSeenTour || forceTour)) {
            setCurrentStep("welcome");
          }
        }
      } catch (error) {
        console.error("Failed to fetch onboarding state:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchState();
  }, [autoStart]);

  const currentStepIndex = currentStep
    ? ONBOARDING_STEPS.findIndex((s) => s.id === currentStep)
    : -1;

  const currentStepInfo = currentStep
    ? ONBOARDING_STEPS.find((s) => s.id === currentStep) || null
    : null;

  const startTour = useCallback(() => {
    setCurrentStep("welcome");
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(ONBOARDING_STEPS[currentStepIndex + 1].id);
    } else {
      setCurrentStep("done");
    }
  }, [currentStepIndex]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStep(ONBOARDING_STEPS[currentStepIndex - 1].id);
    }
  }, [currentStepIndex]);

  const completeTour = useCallback(async () => {
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
      setHasSeenTour(true);
      setCurrentStep(null);
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    }
  }, []);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  return {
    isLoading,
    hasSeenTour,
    currentStep,
    currentStepInfo,
    currentStepIndex,
    totalSteps: ONBOARDING_STEPS.length,
    isActive: currentStep !== null && currentStep !== "done",
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
  };
}
