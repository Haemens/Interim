"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ClientKPIsCards } from "../components/client-kpis";

// =============================================================================
// TYPES
// =============================================================================

interface ClientJobRequest {
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  status: string;
  createdAt: string;
  convertedJobId: string | null;
}

interface ClientJob {
  id: string;
  title: string;
  location: string | null;
  status: string;
  applicationsCount: number;
  createdAt: string;
}

interface ClientShortlist {
  id: string;
  name: string;
  shareToken: string;
  jobTitle: string;
  jobId: string;
  candidatesCount: number;
  approvalsCount: number;
  rejectionsCount: number;
  pendingCount: number;
  createdAt: string;
}

interface ClientTimesheet {
  id: string;
  candidateName: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  status: string;
  createdAt: string;
}

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

interface ClientDetail {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  sector: string | null;
  notes: string | null;
  isActive: boolean;
  requestToken: string;
  createdAt: string;
  updatedAt: string;
  jobRequests: ClientJobRequest[];
  jobs: ClientJob[];
  shortlists: ClientShortlist[];
  timesheets: ClientTimesheet[];
  kpis: ClientKPIs;
}

// =============================================================================
// STATUS CONFIG
// =============================================================================

const JOB_REQUEST_STATUS: Record<string, { label: string; color: string }> = {
  NEW: { label: "Nouveau", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800" },
  IN_REVIEW: { label: "En cours", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800" },
  CONVERTED_TO_JOB: { label: "Converti", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" },
  REJECTED: { label: "Refusé", color: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800" },
};

const JOB_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700" },
  ACTIVE: { label: "Actif", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" },
  PAUSED: { label: "En pause", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800" },
  ARCHIVED: { label: "Archivé", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700" },
};

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"requests" | "jobs" | "shortlists" | "timesheets">("requests");

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/clients/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast({
              title: "Not Found",
              description: "Client not found",
              variant: "error",
            });
            router.push("/dashboard/clients");
            return;
          }
          throw new Error("Failed to fetch client");
        }
        const data = await res.json();
        setClient(data.client);
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load client",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchClient();
    }
  }, [id, router, toast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard/clients" className="hover:text-slate-700">Clients</Link>
          <span>/</span>
          <span className="text-slate-700">Loading...</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/clients" className="hover:text-slate-700">Clients</Link>
        <span>/</span>
        <span className="text-slate-700">{client.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
            {!client.isActive && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Inactive</span>
            )}
            {client.sector && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">{client.sector}</span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
            {client.contactName && <span>{client.contactName}</span>}
            <span>{client.contactEmail}</span>
            {client.contactPhone && <span>{client.contactPhone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/client/${client.requestToken}/request`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            Client Portal →
          </a>
        </div>
      </div>

      {/* KPIs */}
      <ClientKPIsCards kpis={client.kpis} />

      {/* Notes */}
      {client.notes && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Notes</h3>
          <p className="text-slate-600 text-sm whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {[
            { key: "requests", label: "Job Requests", count: client.jobRequests.length },
            { key: "jobs", label: "Jobs", count: client.jobs.length },
            { key: "shortlists", label: "Shortlists", count: client.shortlists.length },
            { key: "timesheets", label: "Timesheets", count: client.timesheets.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Job Requests Tab */}
        {activeTab === "requests" && (
          <>
            {client.jobRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No job requests from this client yet.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Title</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Location</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Date</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {client.jobRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{req.title}</p>
                        {req.contractType && (
                          <p className="text-sm text-slate-500">{req.contractType}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{req.location || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${JOB_REQUEST_STATUS[req.status]?.color || "bg-slate-100"}`}>
                          {JOB_REQUEST_STATUS[req.status]?.label || req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDate(req.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/job-requests/${req.id}`}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Jobs Tab */}
        {activeTab === "jobs" && (
          <>
            {client.jobs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No jobs linked to this client yet.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Title</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Location</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-slate-600">Applications</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {client.jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/jobs/${job.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {job.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{job.location || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${JOB_STATUS[job.status]?.color || "bg-slate-100"}`}>
                          {JOB_STATUS[job.status]?.label || job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600">{job.applicationsCount}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/jobs/${job.id}`}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Shortlists Tab */}
        {activeTab === "shortlists" && (
          <>
            {client.shortlists.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No shortlists shared with this client yet.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Shortlist</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Job</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-slate-600">Candidates</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-slate-600">Feedback</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {client.shortlists.map((sl) => (
                    <tr key={sl.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/shortlists/${sl.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {sl.name}
                        </Link>
                        <p className="text-xs text-slate-500">{formatDate(sl.createdAt)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/jobs/${sl.jobId}`}
                          className="text-slate-600 hover:text-indigo-600"
                        >
                          {sl.jobTitle}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600">{sl.candidatesCount}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <span className="text-green-600">{sl.approvalsCount} ✓</span>
                          <span className="text-red-600">{sl.rejectionsCount} ✗</span>
                          {sl.pendingCount > 0 && (
                            <span className="text-slate-400">{sl.pendingCount} pending</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/dashboard/shortlists/${sl.id}`}
                            className="text-sm text-slate-600 hover:text-slate-800"
                          >
                            Details
                          </Link>
                          <a
                            href={`/shortlist/${sl.shareToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            Public →
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Timesheets Tab */}
        {activeTab === "timesheets" && (
          <>
            {client.timesheets.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No timesheets recorded for this client yet.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Candidate</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Period</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-slate-600">Hours</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {client.timesheets.map((ts) => (
                    <tr key={ts.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{ts.candidateName}</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">
                        {formatDate(ts.periodStart)} - {formatDate(ts.periodEnd)}
                      </td>
                      <td className="px-6 py-4 text-center font-medium">{ts.totalHours}h</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          ts.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" :
                          ts.status === "PAID" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800" :
                          ts.status === "REJECTED" ? "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800" :
                          "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        }`}>
                          {ts.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
