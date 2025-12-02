"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// TYPES
// =============================================================================

interface ShortlistHeaderProps {
  shortlist: {
    id: string;
    name: string;
    shareToken: string;
    shareUrl: string;
    note: string | null;
    createdAt: string;
    job: {
      id: string;
      title: string;
      status: string;
      location: string | null;
    };
    client: {
      id: string;
      name: string;
      contactName: string | null;
      contactEmail: string | null;
    } | null;
    stats: {
      total: number;
      approved: number;
      rejected: number;
      pending: number;
    };
  };
}

// =============================================================================
// STATUS COLORS
// =============================================================================

const JOB_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-amber-100 text-amber-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ShortlistHeader({ shortlist }: ShortlistHeaderProps) {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);

  const handleCopyLink = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(shortlist.shareUrl);
      toast({
        title: "Link Copied",
        description: "Shortlist link copied to clipboard",
        variant: "success",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Could not copy link to clipboard",
        variant: "error",
      });
    } finally {
      setCopying(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Top Row: Title and Actions */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{shortlist.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Created {formatDate(shortlist.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            disabled={copying}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
          >
            {copying ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
            Copy Link
          </button>
          <a
            href={`/shortlist/${shortlist.shareToken}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open Public Link
          </a>
        </div>
      </div>

      {/* Pills Row: Job and Client */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Job Pill */}
        <Link
          href={`/dashboard/jobs/${shortlist.job.id}/campaign`}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 transition-colors"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium text-slate-700">{shortlist.job.title}</span>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${JOB_STATUS_COLORS[shortlist.job.status] || "bg-slate-100"}`}>
            {shortlist.job.status}
          </span>
        </Link>

        {/* Client Pill */}
        {shortlist.client ? (
          <Link
            href={`/dashboard/clients/${shortlist.client.id}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors"
          >
            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-sm font-medium text-purple-700">{shortlist.client.name}</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-sm">No client assigned</span>
          </span>
        )}

        {/* Pipeline Link */}
        <Link
          href={`/dashboard/jobs/${shortlist.job.id}/pipeline`}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Open Pipeline
        </Link>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-slate-900">{shortlist.stats.total}</span>
          <span className="text-sm text-slate-500">candidates</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm text-slate-600">{shortlist.stats.approved} approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="text-sm text-slate-600">{shortlist.stats.rejected} rejected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-slate-300 rounded-full"></span>
            <span className="text-sm text-slate-600">{shortlist.stats.pending} pending</span>
          </div>
        </div>
      </div>

      {/* Note */}
      {shortlist.note && (
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-600">{shortlist.note}</p>
        </div>
      )}
    </div>
  );
}
