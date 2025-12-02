"use client";

import { useState, useEffect } from "react";

interface AnalyticsSummary {
  jobCounts: {
    total: number;
    active: number;
    draft: number;
    paused: number;
    archived: number;
  };
  applicationCounts: {
    total: number;
    byStatus: Record<string, number>;
  };
  recentActivity: {
    last7DaysApplications: number;
    last30DaysApplications: number;
  };
  topJobsByApplications: Array<{
    jobId: string;
    title: string;
    applicationsCount: number;
  }>;
  applicationSources?: {
    bySource: Array<{ source: string; count: number }>;
    byChannel: Array<{ channelId: string; channelName: string; type: string; count: number }>;
  };
}

function StatCard({
  label,
  value,
  color = "indigo",
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    indigo: "bg-primary/10 text-primary",
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    slate: "bg-secondary text-secondary-foreground",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorClasses[color]?.split(" ")[1] || "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "NEW":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "CONTACTED":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "QUALIFIED":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "PLACED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "REJECTED":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

const SOURCE_LABELS: Record<string, string> = {
  channel: "Réseaux Sociaux",
  direct: "Direct",
  job_page: "Page Offre",
  email: "Email",
  qr_code: "QR Code",
  unknown: "Inconnu",
};

const CHANNEL_TYPE_ICONS: Record<string, string> = {
  TIKTOK: "🎵",
  INSTAGRAM: "📸",
  LINKEDIN: "💼",
  FACEBOOK: "👍",
  OTHER: "📱",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics/summary");
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Impossible de charger les statistiques");
        }
        const summary = await res.json();
        setData(summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger les statistiques");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
          <p className="text-muted-foreground mt-1">
            Vue d&apos;ensemble de votre activité de recrutement.
          </p>
        </div>

        {/* Loading skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-20 mb-2"></div>
              <div className="h-8 bg-muted rounded w-12"></div>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
          <div className="h-6 bg-muted rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-muted rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
          <p className="text-muted-foreground mt-1">
            Vue d&apos;ensemble de votre activité de recrutement.
          </p>
        </div>

        {/* Error state */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-destructive">Erreur de chargement</h3>
              <p className="text-destructive/90 mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 text-sm font-medium text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
        <p className="text-muted-foreground mt-1">
          Vue d&apos;ensemble de votre activité de recrutement.
        </p>
      </div>

      {/* Job Stats */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Offres</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Offres" value={data.jobCounts.total} color="slate" />
          <StatCard label="Actives" value={data.jobCounts.active} color="green" />
          <StatCard label="Brouillons" value={data.jobCounts.draft} color="amber" />
          <StatCard label="Archivées" value={data.jobCounts.archived} color="slate" />
        </div>
      </section>

      {/* Application Stats */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Candidatures</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total Candidatures"
            value={data.applicationCounts.total}
            color="indigo"
          />
          <StatCard
            label="7 derniers jours"
            value={data.recentActivity.last7DaysApplications}
            color="blue"
          />
          <StatCard
            label="30 derniers jours"
            value={data.recentActivity.last30DaysApplications}
            color="blue"
          />
        </div>

        {/* By Status */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-medium text-foreground mb-4">Par Statut</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(data.applicationCounts.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                  {status}
                </span>
                <span className="font-medium text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Jobs */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Meilleures offres
        </h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {data.topJobsByApplications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Aucune offre avec candidatures pour le moment.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                    Titre
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">
                    Candidatures
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.topJobsByApplications.map((job, index) => (
                  <tr key={job.jobId}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          #{index + 1}
                        </span>
                        <span className="font-medium text-foreground">
                          {job.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full font-medium">
                        {job.applicationsCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Channel Performance */}
      {data.applicationSources && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Performance des Canaux
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Applications by Source */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-medium text-foreground mb-4">Candidatures par Source</h3>
              {data.applicationSources.bySource.length === 0 ? (
                <p className="text-muted-foreground text-sm">Pas de données de source.</p>
              ) : (
                <div className="space-y-3">
                  {data.applicationSources.bySource.map((item) => {
                    const maxCount = Math.max(...data.applicationSources!.bySource.map((s) => s.count));
                    const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    return (
                      <div key={item.source}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-muted-foreground">
                            {SOURCE_LABELS[item.source] || item.source}
                          </span>
                          <span className="text-sm font-semibold text-foreground">{item.count}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Applications by Channel */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-medium text-foreground mb-4">Candidatures par Canal</h3>
              {data.applicationSources.byChannel.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Pas de données de canal. Utilisez des liens de suivi pour voir d&apos;où viennent vos candidats.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.applicationSources.byChannel.map((item) => {
                    const maxCount = Math.max(...data.applicationSources!.byChannel.map((c) => c.count));
                    const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    return (
                      <div key={item.channelId}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{CHANNEL_TYPE_ICONS[item.type] || "📱"}</span>
                            <span className="text-sm font-medium text-muted-foreground">{item.channelName}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">{item.count}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
