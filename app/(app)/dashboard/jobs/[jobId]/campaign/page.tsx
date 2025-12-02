"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { OverviewCards } from "./overview-cards";
import { PipelineMini } from "./pipeline-mini";
import { SourcesChart } from "./sources-chart";
import { ShortlistsSummary } from "./shortlists-summary";

// =============================================================================
// TYPES
// =============================================================================

interface JobInfo {
  id: string;
  title: string;
  status: string;
  location: string | null;
}

interface PipelineData {
  total: number;
  recentCount: number;
  byStatus: {
    NEW: number;
    CONTACTED: number;
    QUALIFIED: number;
    PLACED: number;
    REJECTED: number;
  };
}

interface SourceItem {
  source: string;
  count: number;
}

interface ChannelItem {
  channelId: string;
  name: string;
  type: string;
  count: number;
}

interface ShortlistItem {
  id: string;
  name: string;
  shareToken: string;
  createdAt: string;
  candidatesCount: number;
  feedback: {
    approved: number;
    rejected: number;
    pending: number;
  };
}

interface AnalyticsData {
  job: JobInfo;
  pipeline: PipelineData;
  sources: {
    bySource: SourceItem[];
    byChannel: ChannelItem[];
  };
  shortlists: {
    total: number;
    items: ShortlistItem[];
  };
}

// =============================================================================
// STATUS CONFIG
// =============================================================================

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAUSED: "bg-amber-100 text-amber-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function JobCampaignPage() {
  const params = useParams();
  const { toast } = useToast();
  const jobId = params.jobId as string;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/analytics`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Job not found");
          } else if (res.status === 403) {
            setError("You don't have permission to view this job's analytics");
          } else {
            setError("Failed to load analytics");
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load analytics");
        toast({
          title: "Error",
          description: "Failed to load campaign analytics",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      fetchAnalytics();
    }
  }, [jobId, toast]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard/jobs" className="hover:text-slate-700">Jobs</Link>
          <span>/</span>
          <span className="text-slate-400">Loading...</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard/jobs" className="hover:text-slate-700">Jobs</Link>
          <span>/</span>
          <span className="text-slate-700">Campaign</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Campaign</h2>
          <p className="text-slate-600">{error || "Something went wrong"}</p>
          <Link
            href="/dashboard/jobs"
            className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/jobs" className="hover:text-slate-700">Jobs</Link>
        <span>/</span>
        <Link href={`/dashboard/jobs/${jobId}`} className="hover:text-slate-700">{data.job.title}</Link>
        <span>/</span>
        <span className="text-slate-700">Campaign</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{data.job.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[data.job.status] || "bg-slate-100"}`}>
              {data.job.status}
            </span>
          </div>
          {data.job.location && (
            <p className="text-slate-500 mt-1">{data.job.location}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/jobs/${jobId}`}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Job Detail
          </Link>
          <Link
            href={`/dashboard/jobs/${jobId}/pipeline`}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Open Pipeline
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <OverviewCards
        total={data.pipeline.total}
        recentCount={data.pipeline.recentCount}
        placed={data.pipeline.byStatus.PLACED}
        qualified={data.pipeline.byStatus.QUALIFIED}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pipeline Mini */}
        <div className="lg:col-span-1">
          <PipelineMini jobId={jobId} byStatus={data.pipeline.byStatus} />
        </div>

        {/* Right Column: Quick Actions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href={`/dashboard/jobs/${jobId}/pipeline`}
                className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Pipeline</p>
                  <p className="text-xs text-slate-500">Manage candidates</p>
                </div>
              </Link>

              <Link
                href={`/dashboard/jobs/${jobId}/social-content`}
                className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2m-10 0V4m10 0V4m-5 8v4m-4-4v4m8-4v4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Social Content</p>
                  <p className="text-xs text-slate-500">Posts & campaigns</p>
                </div>
              </Link>

              <a
                href={`/jobs/${jobId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-900">Public Page</p>
                  <p className="text-xs text-slate-500">View job listing</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Sources Chart */}
      <SourcesChart
        bySource={data.sources.bySource}
        byChannel={data.sources.byChannel}
        total={data.pipeline.total}
      />

      {/* Shortlists Summary */}
      <ShortlistsSummary items={data.shortlists.items} />
    </div>
  );
}
