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
  { key: "NEW", label: "Nouveau", color: "bg-blue-500", textColor: "text-blue-800 dark:text-blue-300", bgLight: "bg-blue-100 dark:bg-blue-900/40" },
  { key: "CONTACTED", label: "Contacté", color: "bg-amber-500", textColor: "text-amber-800 dark:text-amber-300", bgLight: "bg-amber-100 dark:bg-amber-900/40" },
  { key: "QUALIFIED", label: "Qualifié", color: "bg-purple-500", textColor: "text-purple-800 dark:text-purple-300", bgLight: "bg-purple-100 dark:bg-purple-900/40" },
  { key: "PLACED", label: "Recruté", color: "bg-green-500", textColor: "text-green-800 dark:text-green-300", bgLight: "bg-green-100 dark:bg-green-900/40" },
  { key: "REJECTED", label: "Refusé", color: "bg-slate-400", textColor: "text-secondary-foreground", bgLight: "bg-secondary" },
] as const;

// =============================================================================
// COMPONENT
// =============================================================================

export function PipelineMini({ jobId, byStatus }: PipelineMiniProps) {
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Aperçu du Pipeline</h3>
        <Link
          href={`/dashboard/jobs/${jobId}/pipeline`}
          className="text-sm text-primary hover:text-primary/80 font-medium"
        >
          Ouvrir le Pipeline →
        </Link>
      </div>

      {total === 0 ? (
        <p className="text-muted-foreground text-sm">Aucune candidature pour le moment.</p>
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
