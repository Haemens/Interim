"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";

// =============================================================================
// TYPES
// =============================================================================

export type OnboardingStep =
  | "welcome"
  | "create-job"
  | "jobs"
  | "jobs-list"
  | "pipeline"
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
      "Découvrez comment gérer vos recrutements simplement. Suivez le guide pour prendre en main votre espace.",
  },
  {
    id: "create-job",
    title: "1. Publiez une offre",
    description:
      "Tout commence ici. Créez une offre d'emploi attrayante pour attirer les meilleurs talents. Cliquez sur ce bouton pour démarrer.",
    target: '[data-tour="create-job"]',
  },
  {
    id: "jobs",
    title: "2. L'onglet Recrutements",
    description:
      "Cliquez sur cet onglet pour accéder à la liste de tous vos postes ouverts et suivre leur avancement.",
    target: '[data-tour="jobs"]',
  },
  {
    id: "jobs-list",
    title: "3. Liste des offres",
    description:
      "Une fois dans l'onglet Recrutements, vous verrez vos offres. Cliquez sur une offre pour entrer dans son tableau de bord.",
    target: '[data-tour="jobs-list"]',
  },
  {
    id: "pipeline",
    title: "4. Le Pipeline Kanban",
    description:
      "Au cœur de chaque offre, le Kanban vous permet de visualiser l'avancement des candidats. Glissez-déposez les cartes pour changer leur statut (ex: de 'Nouveau' à 'Entretien').",
    target: '[data-tour="pipeline"]',
  },
  {
    id: "candidates",
    title: "5. Vivier de talents",
    description:
      "Cliquez ici pour accéder à votre base de données candidats globale, indépendamment des offres spécifiques.",
    target: '[data-tour="candidates"]',
  },
  {
    id: "analytics",
    title: "6. Analysez vos performances",
    description:
      "Suivez vos indicateurs clés : nombre de candidatures, temps de recrutement, et efficacité de vos canaux d'acquisition.",
    target: '[data-tour="analytics"]',
  },
  {
    id: "billing",
    title: "7. Paramètres & Équipe",
    description:
      "Configurez votre agence, invitez vos collaborateurs et gérez votre abonnement depuis cet espace.",
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
  const searchParams = useSearchParams();
  const forceTour = searchParams.get("tour") === "true";

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
          
          // Auto-start tour for new users or if forced via URL param
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
  }, [autoStart, forceTour]);

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
