"use client";

import { useOnboardingTour } from "@/modules/onboarding/use-onboarding-tour";

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

  // Don't show tour in demo mode or while loading
  if (isDemo || isLoading || !isActive || !currentStepInfo) {
    return null;
  }

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={skipTour} />

      {/* Tour Card */}
      <div className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up">
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
            <h3 className="text-lg font-semibold text-slate-900">
              {currentStepInfo.title}
            </h3>
            <button
              onClick={skipTour}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close tour"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-slate-600 text-sm mb-6">
            {currentStepInfo.description}
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStepIndex
                    ? "w-6 bg-indigo-600"
                    : i < currentStepIndex
                    ? "w-1.5 bg-indigo-300"
                    : "w-1.5 bg-slate-200"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={skipTour}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Skip tour
            </button>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Back
                </button>
              )}
              {isLastStep ? (
                <button
                  onClick={completeTour}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Finish
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

/**
 * Button to replay the onboarding tour
 */
export function ReplayTourButton() {
  const { startTour, hasSeenTour } = useOnboardingTour({ autoStart: false });

  if (!hasSeenTour) return null;

  return (
    <button
      onClick={startTour}
      className="text-sm text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
    >
      <span>🎓</span>
      Replay tour
    </button>
  );
}
