"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Users, Clock, Target } from "lucide-react";

interface AnalyticsData {
  job: {
    id: string;
    title: string;
    status: string;
  };
  pipeline: {
    total: number;
    byStatus: Record<string, number>;
  };
  sources: {
    bySource: { source: string; count: number }[];
  };
}

export default function JobAnalyticsPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/analytics`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load analytics");
        }
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href={`/dashboard/jobs/${jobId}`}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Job
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const statusColors: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-700",
    CONTACTED: "bg-amber-100 text-amber-700",
    QUALIFIED: "bg-purple-100 text-purple-700",
    PLACED: "bg-green-100 text-green-700",
    REJECTED: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/jobs/${jobId}`}
          className="text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Analytics</h1>
          <p className="text-slate-600">{data.job.title}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Applications</p>
              <p className="text-2xl font-bold text-slate-900">{data.pipeline.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Qualified</p>
              <p className="text-2xl font-bold text-slate-900">{data.pipeline.byStatus?.QUALIFIED || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Placed</p>
              <p className="text-2xl font-bold text-slate-900">{data.pipeline.byStatus?.PLACED || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">New</p>
              <p className="text-2xl font-bold text-slate-900">{data.pipeline.byStatus?.NEW || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Pipeline Breakdown</h2>
        <div className="space-y-3">
          {Object.entries(data.pipeline.byStatus || {}).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status] || "bg-slate-100 text-slate-700"}`}>
                {status}
              </span>
              <span className="text-slate-900 font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sources */}
      {data.sources.bySource.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Application Sources</h2>
          <div className="space-y-3">
            {data.sources.bySource.map((source) => (
              <div key={source.source} className="flex items-center justify-between">
                <span className="text-slate-700">{source.source || "Direct"}</span>
                <span className="text-slate-900 font-medium">{source.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
