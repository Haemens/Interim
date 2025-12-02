import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        {/* 404 illustration */}
        <div className="text-7xl font-bold text-slate-200 mb-4">404</div>
        
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Page not found
        </h1>
        
        <p className="text-slate-600 mb-6 max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-5 py-2.5 bg-white text-slate-700 font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
