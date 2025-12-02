import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getEffectiveTenant } from "@/lib/get-effective-tenant";
import { isDemoAgencySlug } from "@/modules/auth/demo-mode";
import { PipelineBoard } from "./board";
import { ActivityTimeline } from "./activity-timeline";

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getJobData(jobId: string, agencyId: string) {
  const job = await db.job.findFirst({
    where: {
      id: jobId,
      agencyId,
    },
    select: {
      id: true,
      title: true,
      location: true,
      status: true,
      _count: {
        select: {
          applications: true,
        },
      },
    },
  });

  return job;
}

async function getMembership(userId: string, agencySlug: string) {
  const membership = await db.membership.findFirst({
    where: {
      user: { id: userId },
      agency: { slug: agencySlug },
    },
    include: {
      agency: true,
    },
  });

  return membership;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function JobPipelinePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  
  // Get tenant with fallback for Vercel deployments without subdomains
  const { tenantSlug, agency, user } = await getEffectiveTenant();

  if (!tenantSlug || !agency || !user) {
    redirect("/login");
  }

  // Get membership
  const membership = await getMembership(user.id, tenantSlug);
  if (!membership) {
    redirect("/login");
  }

  // Check role - RECRUITER+ can access pipeline
  const canEdit = ["RECRUITER", "ADMIN", "OWNER"].includes(membership.role);
  if (!canEdit && membership.role !== "VIEWER") {
    redirect("/dashboard");
  }

  // Get job data
  const job = await getJobData(jobId, membership.agencyId);
  if (!job) {
    redirect("/dashboard/jobs");
  }

  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: "Active",
      DRAFT: "Brouillon",
      PAUSED: "En pause",
      ARCHIVED: "Archivée",
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/dashboard/jobs" className="hover:text-slate-700">
              Offres
            </Link>
            <span>/</span>
            <Link href={`/dashboard/jobs/${jobId}`} className="hover:text-slate-700">
              {job.title}
            </Link>
            <span>/</span>
            <span className="text-slate-700">Pipeline</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
          <p className="text-slate-500 mt-1">
            {job.location && <span>{job.location} • </span>}
            {job._count.applications} candidature{job._count.applications !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              job.status === "ACTIVE"
                ? "bg-green-100 text-green-700"
                : job.status === "DRAFT"
                ? "bg-slate-100 text-slate-700"
                : job.status === "PAUSED"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {translateStatus(job.status)}
          </span>
          <Link
            href={`/dashboard/jobs/${jobId}`}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Détails de l&apos;offre
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-6">
        {/* Kanban Board */}
        <div className="flex-1 min-w-0">
          <PipelineBoard
            jobId={jobId}
            canEdit={canEdit}
            isDemo={isDemoAgencySlug(tenantSlug)}
          />
        </div>

        {/* Activity Timeline */}
        <div className="w-80 flex-shrink-0">
          <ActivityTimeline jobId={jobId} />
        </div>
      </div>
    </div>
  );
}
