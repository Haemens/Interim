"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        {/* Error illustration */}
        <div className="text-5xl mb-4">⚠️</div>
        
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Something went wrong
        </h1>
        
        <p className="text-slate-600 mb-6 max-w-sm">
          We encountered an error loading this page. Please try again.
        </p>

        {error.digest && (
          <p className="text-xs text-slate-400 mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-white text-slate-700 font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
