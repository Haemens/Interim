"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// TYPES
// =============================================================================

interface Client {
  id: string;
  name: string;
  companyName: string | null;
}

interface LinkedJob {
  id: string;
  title: string;
  status: string;
}

interface JobRequest {
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  salaryRange: string | null;
  status: string;
  createdAt: string;
  client: Client | null;
  linkedJob: LinkedJob | null;
}

// =============================================================================
// STATUS CONFIG
// =============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NEW: { label: "New", color: "bg-blue-100 text-blue-700" },
  IN_REVIEW: { label: "In Review", color: "bg-amber-100 text-amber-700" },
  CONVERTED_TO_JOB: { label: "Converted", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700" },
};

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function JobRequestsPage() {
  const { toast } = useToast();
  const [jobRequests, setJobRequests] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchJobRequests() {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }

        const res = await fetch(`/api/job-requests?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch job requests");
        }
        const data = await res.json();
        setJobRequests(data.jobRequests);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load job requests");
        toast({
          title: "Error",
          description: "Failed to load job requests",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchJobRequests();
  }, [statusFilter, toast]);

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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Requests</h1>
          <p className="text-slate-500 mt-1">Manage job requests from your clients</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Requests</h1>
          <p className="text-slate-500 mt-1">Manage job requests from your clients</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Requests</h1>
          <p className="text-slate-500 mt-1">Manage job requests from your clients</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {["all", "NEW", "IN_REVIEW", "CONVERTED_TO_JOB", "REJECTED"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === status
                ? "bg-indigo-100 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {status === "all" ? "All" : STATUS_CONFIG[status]?.label || status}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {jobRequests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No job requests yet</h3>
            <p className="text-slate-500">
              Job requests from your clients will appear here.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Title</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Client</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Location</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Date</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobRequests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{request.title}</p>
                      {request.contractType && (
                        <p className="text-sm text-slate-500">{request.contractType}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {request.client ? (
                      <div>
                        <p className="text-slate-900">{request.client.name}</p>
                        {request.client.companyName && (
                          <p className="text-sm text-slate-500">{request.client.companyName}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {request.location || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[request.status]?.color || "bg-slate-100 text-slate-600"}`}>
                      {STATUS_CONFIG[request.status]?.label || request.status}
                    </span>
                    {request.linkedJob && (
                      <Link
                        href={`/dashboard/jobs/${request.linkedJob.id}`}
                        className="block text-xs text-indigo-600 hover:text-indigo-700 mt-1"
                      >
                        → {request.linkedJob.title}
                      </Link>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/job-requests/${request.id}`}
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
      </div>
    </div>
  );
}
