"use client";

// =============================================================================
// TYPES
// =============================================================================

interface ClientKPIs {
  totalJobs: number;
  activeJobs: number;
  totalJobRequests: number;
  pendingJobRequests: number;
  totalShortlists: number;
  totalCandidatesReviewed: number;
  totalApprovals: number;
  totalRejections: number;
  totalPlacements: number;
}

interface ClientKPIsProps {
  kpis: ClientKPIs;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ClientKPIsCards({ kpis }: ClientKPIsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Active Jobs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Active Jobs</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{kpis.activeJobs}</p>
        <p className="text-xs text-slate-400 mt-1">{kpis.totalJobs} total</p>
      </div>

      {/* Pending Requests */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Pending Requests</p>
        <p className="text-2xl font-bold text-amber-600 mt-1">{kpis.pendingJobRequests}</p>
        <p className="text-xs text-slate-400 mt-1">{kpis.totalJobRequests} total</p>
      </div>

      {/* Placements */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Placements</p>
        <p className="text-2xl font-bold text-green-600 mt-1">{kpis.totalPlacements}</p>
        <p className="text-xs text-slate-400 mt-1">candidates placed</p>
      </div>

      {/* Feedback */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Candidate Feedback</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-lg font-bold text-green-600">{kpis.totalApprovals}</span>
          <span className="text-slate-400">/</span>
          <span className="text-lg font-bold text-red-600">{kpis.totalRejections}</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">{kpis.totalCandidatesReviewed} reviewed</p>
      </div>
    </div>
  );
}
