"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center">
        {/* 404 illustration */}
        <div className="text-8xl font-bold text-slate-200 mb-4">404</div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Page not found
        </h1>
        
        <p className="text-slate-600 mb-8 max-w-md">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. 
          It might have been moved or doesn&apos;t exist.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Homepage
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-white text-slate-700 font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Go Back
          </button>
        </div>

        {/* Help text */}
        <p className="text-sm text-slate-500 mt-8">
          Need help?{" "}
          <a href="mailto:support@questhire.com" className="text-indigo-600 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
