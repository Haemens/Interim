"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Job {
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  status: string;
  createdAt: string;
  _count: {
    applications: number;
  };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs");
        if (!res.ok) {
          throw new Error("Impossible de récupérer les offres");
        }
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  function getStatusColor(status: string): string {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium";
      case "DRAFT":
        return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 font-medium";
      case "PAUSED":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-medium";
      case "CLOSED":
      case "ARCHIVED":
        return "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 font-medium";
      default:
        return "bg-secondary text-secondary-foreground font-medium";
    }
  }

  function translateStatus(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: "Active",
      DRAFT: "Brouillon",
      PAUSED: "En pause",
      CLOSED: "Fermée",
      ARCHIVED: "Archivée",
    };
    return map[status] || status;
  }

  function translateContractType(type: string | null): string {
    if (!type) return "—";
    const map: Record<string, string> = {
      FULL_TIME: "CDI",
      PART_TIME: "Temps partiel",
      CONTRACT: "CDD",
      FREELANCE: "Freelance",
      INTERNSHIP: "Stage",
      INTERIM: "Intérim",
    };
    return map[type] || type;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Offres</h1>
        </div>
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <div className="animate-pulse text-muted-foreground">Chargement des offres...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Offres</h1>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Offres</h1>
        <Link
          href="/dashboard/jobs/new"
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          + Nouvelle offre
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="text-muted-foreground mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Aucune offre
          </h3>
          <p className="text-muted-foreground mb-6">
            Publiez votre première offre pour recevoir des candidatures.
          </p>
          <Link
            href="/dashboard/jobs/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Créer une offre
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Titre du poste
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Lieu
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Candidatures
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Statut
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {job.location || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {translateContractType(job.contractType)}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {job._count.applications}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getStatusColor(job.status)}`}
                    >
                      {translateStatus(job.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="text-sm text-primary hover:text-primary/90 font-medium"
                    >
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
