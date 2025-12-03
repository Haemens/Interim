"use client";

import { useOnboardingTour } from "@/modules/onboarding/use-onboarding-tour";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface OnboardingTourProps {
  isDemo?: boolean;
}

/**
 * Onboarding tour component
 * Shows a floating card with tour steps for new users
 */
export function OnboardingTour({ isDemo = false }: OnboardingTourProps) {
  const {
    isLoading,
    currentStep,
    currentStepInfo,
    currentStepIndex,
    totalSteps,
    isActive,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
  } = useOnboardingTour({ autoStart: !isDemo });

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track target element position
  useEffect(() => {
    if (!isActive || !currentStepInfo?.target) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      const el = document.querySelector(currentStepInfo.target!);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        // el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    };

    // Initial update
    // Small delay to allow UI to settle
    const timer = setTimeout(updatePosition, 100);
    
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isActive, currentStepInfo]);

  // Don't show tour in demo mode or while loading
  if (isDemo || isLoading || !isActive || !currentStepInfo || !mounted) {
    return null;
  }

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Use portal to break out of any overflow:hidden containers
  return createPortal(
    <>
      {/* Backdrop with hole (simulated with SVG mask or just 4 divs, keeping it simple with standard backdrop for now) */}
      {/* We use a transparent backdrop that allows clicking through ONLY on the target? No, tour usually blocks interaction until next. */}
      <div className="fixed inset-0 z-[90]" style={{ pointerEvents: "none" }}>
        {/* Dimmed Background - composed of 4 rects around the target if it exists, or full screen if not */}
        {targetRect ? (
          <>
            {/* Top */}
            <div className="absolute top-0 left-0 right-0 bg-black/50 transition-all duration-300" style={{ height: targetRect.top }} />
            {/* Bottom */}
            <div className="absolute left-0 right-0 bottom-0 bg-black/50 transition-all duration-300" style={{ top: targetRect.bottom }} />
            {/* Left */}
            <div className="absolute left-0 bg-black/50 transition-all duration-300" style={{ top: targetRect.top, bottom: window.innerHeight - targetRect.bottom, width: targetRect.left }} />
            {/* Right */}
            <div className="absolute right-0 bg-black/50 transition-all duration-300" style={{ top: targetRect.top, bottom: window.innerHeight - targetRect.bottom, left: targetRect.right }} />
            
            {/* Highlight border */}
            <div 
              className="absolute border-2 border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2)] rounded-md transition-all duration-300 animate-pulse"
              style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={skipTour} />
        )}
      </div>

      {/* Tour Card */}
      <div 
        className="fixed z-[100] w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        style={
          targetRect 
            ? {
                // Attempt to position near target
                // If target is on the left, put card on right. If target on right, put on left.
                top: Math.max(20, Math.min(window.innerHeight - 300, targetRect.top)),
                left: targetRect.left > window.innerWidth / 2 
                  ? Math.max(20, targetRect.left - 400) // Put on left
                  : Math.min(window.innerWidth - 400, targetRect.right + 20) // Put on right
              }
            : {
                // Default centered position for welcome
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)"
              }
        }
      >
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              {currentStepInfo.title}
            </h3>
            <button
              onClick={skipTour}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Fermer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-slate-600 text-sm mb-8 leading-relaxed">
            {currentStepInfo.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={skipTour}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors font-medium"
            >
              Passer
            </button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Précédent
                </button>
              )}
              {isLastStep ? (
                <button
                  onClick={completeTour}
                  className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
                >
                  Terminer
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
                >
                  Suivant
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex justify-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStepIndex
                    ? "w-6 bg-indigo-600"
                    : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

/**
 * Button to replay the onboarding tour
 */
export function ReplayTourButton() {
  const router = useRouter();
  const { hasSeenTour, startTour } = useOnboardingTour({ autoStart: false });

  // If hasSeenTour is null (loading) or false, don't show replay
  if (hasSeenTour !== true) return null;

  const handleReplay = () => {
    // Start tour directly and update URL
    startTour();
    // Also update URL so it persists on refresh
    const url = new URL(window.location.href);
    url.searchParams.set("tour", "true");
    router.push(url.pathname + url.search);
  };

  return (
    <button
      onClick={handleReplay}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-secondary/50"
    >
      <span>🎓</span>
      Revoir le tutoriel
    </button>
  );
}
