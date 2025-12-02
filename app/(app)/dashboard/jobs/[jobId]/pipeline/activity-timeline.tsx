"use client";

import { useState, useEffect } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface ActivityItem {
  id: string;
  type: string;
  createdAt: string;
  userName: string | null;
  summary: string;
}

interface ActivityTimelineProps {
  jobId: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `il y a ${diffMins}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return date.toLocaleDateString("fr-FR");
}

function getEventIcon(type: string): string {
  switch (type) {
    case "JOB_CREATED":
      return "📋";
    case "JOB_PUBLISHED":
      return "🚀";
    case "APPLICATION_CREATED":
      return "📥";
    case "APPLICATION_STATUS_CHANGED":
      return "🔄";
    case "MATCHING_CANDIDATES_NOTIFIED":
      return "📧";
    case "SHORTLIST_CREATED":
      return "📝";
    default:
      return "📌";
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ActivityTimeline({ jobId }: ActivityTimelineProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      try {
        setLoading(true);
        const response = await fetch(`/api/jobs/${jobId}/activity?limit=15`);

        if (!response.ok) {
          throw new Error("Impossible de charger l'activité");
        }

        const data = await response.json();
        setItems(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Échec du chargement");
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [jobId]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900 mb-4">Activité récente</h3>

      {loading && (
        <div className="text-center py-8 text-slate-500 text-sm">
          Chargement de l'activité...
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-red-500 text-sm">{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          Aucune activité pour le moment
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="flex gap-3">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm">
                  {getEventIcon(item.type)}
                </div>
                {index < items.length - 1 && (
                  <div className="w-0.5 flex-1 bg-slate-200 mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <p className="text-sm text-slate-700">{item.summary}</p>
                <div className="flex items-center gap-2 mt-1">
                  {item.userName && (
                    <span className="text-xs text-slate-500">{item.userName}</span>
                  )}
                  <span className="text-xs text-slate-400">
                    {formatTimeAgo(item.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
