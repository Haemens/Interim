"use client";

import { ReactNode } from "react";
import { ToastProvider } from "./toast-provider";

interface DashboardProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers for the dashboard
 * Wraps children with toast context and other client providers
 */
export function DashboardProviders({ children }: DashboardProvidersProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
