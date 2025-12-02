"use client";

import { ReactNode } from "react";
import { ToastContext, useToastState, Toast, ToastVariant } from "@/hooks/use-toast";

// =============================================================================
// TOAST ITEM
// =============================================================================

const VARIANT_STYLES: Record<ToastVariant, { bg: string; icon: string; border: string }> = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "✓",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "✕",
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    icon: "⚠",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "ℹ",
  },
};

const VARIANT_TEXT: Record<ToastVariant, string> = {
  success: "text-green-800",
  error: "text-red-800",
  warning: "text-yellow-800",
  info: "text-blue-800",
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const styles = VARIANT_STYLES[toast.variant];
  const textColor = VARIANT_TEXT[toast.variant];

  return (
    <div
      className={`${styles.bg} ${styles.border} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-[400px] animate-slide-in`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className={`${textColor} text-lg flex-shrink-0`}>{styles.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${textColor}`}>{toast.title}</p>
          {toast.description && (
            <p className={`text-sm mt-1 ${textColor} opacity-80`}>{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className={`${textColor} opacity-60 hover:opacity-100 transition-opacity flex-shrink-0`}
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// TOAST CONTAINER
// =============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// =============================================================================
// TOAST PROVIDER
// =============================================================================

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { toasts, toast, dismiss, dismissAll } = useToastState();

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      
      {/* Animation styles */}
      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.2s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
