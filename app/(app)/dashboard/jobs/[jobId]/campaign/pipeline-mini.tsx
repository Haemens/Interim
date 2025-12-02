"use client";

import Link from "next/link";

// =============================================================================
// TYPES
// =============================================================================

interface PipelineMiniProps {
  jobId: string;
  byStatus: {
    NEW: number;
    CONTACTED: number;
    QUALIFIED: number;
    PLACED: number;
    REJECTED: number;
  };
}

// =============================================================================
// STATUS CONFIG
// =============================================================================

const STATUS_CONFIG = [
  { key: "NEW", label: "New", color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-100" },
  { key: "CONTACTED", label: "Contacted", color: "bg-amber-500", textColor: "text-amber-700", bgLight: "bg-amber-100" },
  { key: "QUALIFIED", label: "Qualified", color: "bg-purple-500", textColor: "text-purple-700", bgLight: "bg-purple-100" },
  { key: "PLACED", label: "Placed", color: "bg-green-500", textColor: "text-green-700", bgLight: "bg-green-100" },
  { key: "REJECTED", label: "Rejected", color: "bg-slate-400", textColor: "text-slate-600", bgLight: "bg-slate-100" },
] as const;

// =============================================================================
// COMPONENT
// =============================================================================

export function PipelineMini({ jobId, byStatus }: PipelineMiniProps) {
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Pipeline Overview</h3>
        <Link
          href={`/dashboard/jobs/${jobId}/pipeline`}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Open Pipeline →
        </Link>
      </div>

      {total === 0 ? (
        <p className="text-slate-500 text-sm">No applications yet.</p>
      ) : (
        <>
          {/* Stacked Bar */}
          <div className="h-4 rounded-full overflow-hidden flex mb-4">
            {STATUS_CONFIG.map(({ key, color }) => {
              const count = byStatus[key as keyof typeof byStatus];
              const percentage = (count / total) * 100;
              if (percentage === 0) return null;
              return (
                <div
                  key={key}
                  className={`${color} transition-all`}
                  style={{ width: `${percentage}%` }}
                  title={`${key}: ${count}`}
                />
              );
            })}
          </div>

          {/* Status Chips */}
          <div className="flex flex-wrap gap-2">
            {STATUS_CONFIG.map(({ key, label, textColor, bgLight }) => {
              const count = byStatus[key as keyof typeof byStatus];
              return (
                <div
                  key={key}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${bgLight} ${textColor}`}
                >
                  {label}: {count}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
