"use client";

import { useState, useCallback, useEffect } from "react";

// =============================================================================
// TYPES
// =============================================================================

export type OnboardingStep =
  | "welcome"
  | "jobs"
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
    title: "Welcome to QuestHire! 👋",
    description:
      "Let's take a quick tour to help you get started. You'll learn how to create jobs, manage candidates, and track your hiring pipeline.",
  },
  {
    id: "jobs",
    title: "Create Your First Job",
    description:
      "Start by creating a job posting. You can add details like title, location, salary, and requirements. Jobs can be published to your public careers page.",
    target: '[data-tour="jobs"]',
  },
  {
    id: "pipeline",
    title: "Visual Candidate Pipeline",
    description:
      "Each job has a Kanban-style pipeline. Drag candidates through stages: New → Contacted → Qualified → Interview → Placed.",
    target: '[data-tour="pipeline"]',
  },
  {
    id: "candidates",
    title: "Your Talent Pool",
    description:
      "Every applicant is automatically added to your talent pool. Search and re-contact past candidates for new opportunities.",
    target: '[data-tour="candidates"]',
  },
  {
    id: "analytics",
    title: "Track Your Performance",
    description:
      "View real-time analytics on your hiring funnel, source effectiveness, and team performance.",
    target: '[data-tour="analytics"]',
  },
  {
    id: "billing",
    title: "Plans & Billing",
    description:
      "Manage your subscription, upgrade your plan, or add team members. Start with our free trial!",
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
          
          // Auto-start tour for new users
          if (autoStart && !data.hasSeenTour) {
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
