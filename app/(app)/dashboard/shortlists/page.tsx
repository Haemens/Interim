"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ShortlistRowActions } from "./shortlist-row-actions";

// =============================================================================
// TYPES
// =============================================================================

interface Shortlist {
  id: string;
  name: string;
  shareToken: string;
  shareUrl: string;
  note: string | null;
  createdAt: string;
  job: {
    id: string;
    title: string;
  };
  client: {
    id: string;
    name: string;
  } | null;
  candidatesCount: number;
  _count?: {
    items: number;
  };
  items?: { id: string }[];
}

interface Job {
  id: string;
  title: string;
}

interface Client {
  id: string;
  name: string;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function ShortlistsPage() {
  const { toast } = useToast();
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [canUseShortlists, setCanUseShortlists] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchShortlists();
  }, [search, jobFilter, clientFilter]);

  const fetchData = async () => {
    try {
      // Fetch jobs and clients for filters
      const [jobsRes, clientsRes] = await Promise.all([
        fetch("/api/jobs?status=ACTIVE&limit=100"),
        fetch("/api/clients?limit=100&isActive=true"),
      ]);

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs || []);
      }

      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.clients || []);
      }

      // Check demo mode from response headers or agency data
      // For now, we'll detect it from the shortlists API response
    } catch {
      // Ignore filter data errors
    }
  };

  const fetchShortlists = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (jobFilter) params.set("jobId", jobFilter);
      if (clientFilter) params.set("clientId", clientFilter);

      const res = await fetch(`/api/shortlists?${params.toString()}`);

      if (res.status === 403) {
        const data = await res.json();
        if (data.code === "PLAN_LIMIT") {
          setCanUseShortlists(false);
          return;
        }
      }

      if (!res.ok) {
        throw new Error("Failed to fetch shortlists");
      }

      const data = await res.json();
      setShortlists(data.shortlists || []);

      // Check if demo agency (simplified check)
      if (data.shortlists?.length > 0) {
        // Could check agency slug from context
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load shortlists",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Plan gating: show upsell if shortlists not available
  if (!canUseShortlists) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Shortlists</h1>
        </div>

        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-8 text-white">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-2">Upgrade to Share Candidates</h2>
            <p className="text-indigo-100 mb-6">
              Shortlists allow you to share curated candidate selections with clients via a
              beautiful public page. Collect feedback and track approvals in one place.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/billing"
                className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Upgrade to Pro
              </Link>
              <span className="text-indigo-200">Available on Pro & Agency+ plans</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shortlists</h1>
          <p className="text-slate-500 mt-1">
            Share curated candidates with clients and collect feedback
          </p>
        </div>
        <Link
          href="/dashboard/jobs"
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Create from Pipeline
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search shortlists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Job Filter */}
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>

          {/* Client Filter */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shortlists Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">Loading shortlists...</p>
          </div>
        ) : shortlists.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No shortlists yet</h3>
            <p className="text-slate-500 mb-4">
              Create your first shortlist from a job's pipeline.
            </p>
            <Link
              href="/dashboard/jobs"
              className="inline-block px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Go to Jobs
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Job</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Client</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-slate-600">Candidates</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Created</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shortlists.map((shortlist) => (
                <tr key={shortlist.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/shortlists/${shortlist.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-600"
                    >
                      {shortlist.name}
                    </Link>
                    {shortlist.note && (
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{shortlist.note}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/jobs/${shortlist.job.id}`}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      {shortlist.job.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {shortlist.client ? (
                      <Link
                        href={`/dashboard/clients/${shortlist.client.id}`}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        {shortlist.client.name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                      {shortlist.candidatesCount || shortlist._count?.items || shortlist.items?.length || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {formatDate(shortlist.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <ShortlistRowActions
                        shortlistId={shortlist.id}
                        shareUrl={shortlist.shareUrl}
                        shareToken={shortlist.shareToken}
                        isDemo={isDemo}
                      />
                    </div>
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
