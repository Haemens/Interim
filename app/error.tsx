"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console in development
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center">
        {/* Error illustration */}
        <div className="text-6xl mb-4">⚠️</div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Something went wrong
        </h1>
        
        <p className="text-slate-600 mb-8 max-w-md">
          We encountered an unexpected error. Our team has been notified and 
          is working to fix it.
        </p>

        {/* Error digest for support */}
        {error.digest && (
          <p className="text-xs text-slate-400 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-white text-slate-700 font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>

        {/* Help text */}
        <p className="text-sm text-slate-500 mt-8">
          If this problem persists,{" "}
          <a href="mailto:support@questhire.com" className="text-indigo-600 hover:underline">
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}
