"use client";

// =============================================================================
// TYPES
// =============================================================================

interface OverviewCardsProps {
  total: number;
  recentCount: number;
  placed: number;
  qualified: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OverviewCards({ total, recentCount, placed, qualified }: OverviewCardsProps) {
  const conversionRate = total > 0 ? ((placed / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Applications */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Total Applications</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
        <p className="text-xs text-slate-400 mt-1">
          {recentCount} new this week
        </p>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">New (Last 7 days)</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">{recentCount}</p>
        <p className="text-xs text-slate-400 mt-1">
          {total > 0 ? ((recentCount / total) * 100).toFixed(0) : 0}% of total
        </p>
      </div>

      {/* Qualified */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Qualified</p>
        <p className="text-2xl font-bold text-purple-600 mt-1">{qualified}</p>
        <p className="text-xs text-slate-400 mt-1">
          Ready for placement
        </p>
      </div>

      {/* Placements / Conversion */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Placements</p>
        <p className="text-2xl font-bold text-green-600 mt-1">{placed}</p>
        <p className="text-xs text-slate-400 mt-1">
          {conversionRate}% conversion
        </p>
      </div>
    </div>
  );
}
