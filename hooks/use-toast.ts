"use client";

import { createContext, useContext, useCallback, useState } from "react";

// =============================================================================
// TYPES
// =============================================================================

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

export const ToastContext = createContext<ToastContextValue | null>(null);

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access toast functionality
 * 
 * @example
 * ```tsx
 * const { toast } = useToast();
 * 
 * toast({ title: "Success!", variant: "success" });
 * toast({ title: "Error", description: "Something went wrong", variant: "error" });
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  
  return context;
}

// =============================================================================
// PROVIDER HOOK (for internal use)
// =============================================================================

let toastCounter = 0;

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((input: ToastInput): string => {
    const id = `toast-${++toastCounter}`;
    const newToast: Toast = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant || "info",
      duration: input.duration ?? 5000,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    }

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    toast,
    dismiss,
    dismissAll,
  };
}
