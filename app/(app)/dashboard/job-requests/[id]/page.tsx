"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  description: string | null;
  requirements: string | null;
  startDate: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  client: Client | null;
  linkedJob: LinkedJob | null;
}

// =============================================================================
// STATUS CONFIG
// =============================================================================

const STATUS_OPTIONS = [
  { value: "NEW", label: "New", color: "bg-blue-100 text-blue-700" },
  { value: "IN_REVIEW", label: "In Review", color: "bg-amber-100 text-amber-700" },
  { value: "CONVERTED_TO_JOB", label: "Converted to Job", color: "bg-green-100 text-green-700" },
  { value: "REJECTED", label: "Rejected", color: "bg-red-100 text-red-700" },
];

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function JobRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [jobRequest, setJobRequest] = useState<JobRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchJobRequest() {
      try {
        const res = await fetch(`/api/job-requests?limit=100`);
        if (!res.ok) {
          throw new Error("Failed to fetch job request");
        }
        const data = await res.json();
        const found = data.jobRequests.find((r: JobRequest) => r.id === id);
        if (!found) {
          throw new Error("Job request not found");
        }
        setJobRequest(found);
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load job request",
          variant: "error",
        });
        router.push("/dashboard/job-requests");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchJobRequest();
    }
  }, [id, router, toast]);

  const handleStatusChange = async (newStatus: string) => {
    if (!jobRequest) return;

    setUpdating(true);
    try {
      const res = await fetch("/api/job-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: jobRequest.id,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      const data = await res.json();
      setJobRequest(data.jobRequest);

      toast({
        title: "Status Updated",
        description: `Job request marked as ${STATUS_OPTIONS.find((s) => s.value === newStatus)?.label}`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update status",
        variant: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard/job-requests" className="hover:text-slate-700">
            Job Requests
          </Link>
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

  if (!jobRequest) {
    return null;
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === jobRequest.status);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/job-requests" className="hover:text-slate-700">
          Job Requests
        </Link>
        <span>/</span>
        <span className="text-slate-700">{jobRequest.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{jobRequest.title}</h1>
          {jobRequest.client && (
            <p className="text-slate-600 mt-1">
              From: {jobRequest.client.name}
              {jobRequest.client.companyName && ` (${jobRequest.client.companyName})`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm px-3 py-1 rounded-full ${currentStatus?.color || "bg-slate-100 text-slate-600"}`}>
            {currentStatus?.label || jobRequest.status}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Request Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              {jobRequest.location && (
                <div>
                  <dt className="text-sm text-slate-500">Location</dt>
                  <dd className="text-slate-900">{jobRequest.location}</dd>
                </div>
              )}
              {jobRequest.contractType && (
                <div>
                  <dt className="text-sm text-slate-500">Contract Type</dt>
                  <dd className="text-slate-900">{jobRequest.contractType}</dd>
                </div>
              )}
              {jobRequest.salaryRange && (
                <div>
                  <dt className="text-sm text-slate-500">Salary Range</dt>
                  <dd className="text-slate-900">{jobRequest.salaryRange}</dd>
                </div>
              )}
              {jobRequest.startDate && (
                <div>
                  <dt className="text-sm text-slate-500">Expected Start</dt>
                  <dd className="text-slate-900">
                    {new Date(jobRequest.startDate).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Description */}
          {jobRequest.description && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Description</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{jobRequest.description}</p>
            </div>
          )}

          {/* Requirements */}
          {jobRequest.requirements && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Requirements</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{jobRequest.requirements}</p>
            </div>
          )}

          {/* Notes */}
          {jobRequest.notes && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Notes</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{jobRequest.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Update Status</h2>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusChange(status.value)}
                  disabled={updating || jobRequest.status === status.value}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                    jobRequest.status === status.value
                      ? status.color + " cursor-default"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  } disabled:opacity-50`}
                >
                  {status.label}
                  {jobRequest.status === status.value && " ✓"}
                </button>
              ))}
            </div>
          </div>

          {/* Linked Job */}
          {jobRequest.linkedJob && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Linked Job</h2>
              <Link
                href={`/dashboard/jobs/${jobRequest.linkedJob.id}`}
                className="block p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <p className="font-medium text-slate-900">{jobRequest.linkedJob.title}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Status: {jobRequest.linkedJob.status}
                </p>
              </Link>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Timeline</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Submitted</dt>
                <dd className="text-slate-900">{formatDate(jobRequest.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Last Updated</dt>
                <dd className="text-slate-900">{formatDate(jobRequest.updatedAt)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
