import { db } from "@/lib/db";
import { getEffectiveTenant } from "@/lib/get-effective-tenant";

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getAgencyData(agencyId: string) {
  const agency = await db.agency.findUnique({
    where: { id: agencyId },
    include: {
      subscriptions: {
        where: { status: "ACTIVE" },
        take: 1,
      },
    },
  });

  return agency;
}

async function getJobsWithStats(agencyId: string) {
  const jobs = await db.job.findMany({
    where: { agencyId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  return jobs;
}

async function getRecentApplications(agencyId: string) {
  const applications = await db.application.findMany({
    where: { agencyId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      job: {
        select: { title: true },
      },
    },
  });

  return applications;
}

async function getStats(agencyId: string) {
  const [activeJobs, totalApplications, newApplications, placedCount] =
    await Promise.all([
      db.job.count({ where: { agencyId, status: "ACTIVE" } }),
      db.application.count({ where: { agencyId } }),
      db.application.count({ where: { agencyId, status: "NEW" } }),
      db.application.count({ where: { agencyId, status: "PLACED" } }),
    ]);

  return [
    { label: "Active Jobs", value: activeJobs.toString(), change: "published" },
    {
      label: "Total Applications",
      value: totalApplications.toString(),
      change: `${newApplications} new`,
    },
    { label: "New Candidates", value: newApplications.toString(), change: "to review" },
    { label: "Placements", value: placedCount.toString(), change: "successful" },
  ];
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function DashboardPage() {
  const { agency: tenantAgency } = await getEffectiveTenant();

  // If no agency found, show placeholder
  if (!tenantAgency) {
    return (
      <div className="space-y-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-amber-800">
            No Agency Found
          </h2>
          <p className="text-amber-700 mt-1">
            Please log in to access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  const agency = await getAgencyData(tenantAgency.id);

  if (!agency) {
    return (
      <div className="space-y-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-amber-800">
            Agency Not Found
          </h2>
          <p className="text-amber-700 mt-1">
            The agency could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  // Fetch all data in parallel
  const [jobs, applications, stats] = await Promise.all([
    getJobsWithStats(agency.id),
    getRecentApplications(agency.id),
    getStats(agency.id),
  ]);

  const activePlan = agency.subscriptions[0]?.plan || "STARTER";

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome to {agency.name}
        </h1>
        <p className="text-slate-600 mt-1">
          Here&apos;s what&apos;s happening at{" "}
          <span className="font-medium">{agency.slug}</span> today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-xl border border-slate-200"
          >
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-2">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Jobs</h2>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View all →
            </button>
          </div>
          {jobs.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">
              No jobs yet. Create your first job posting!
            </p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-slate-900">{job.title}</p>
                    <p className="text-sm text-slate-500">
                      {job._count.applications} application
                      {job._count.applications !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      job.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : job.status === "DRAFT"
                          ? "bg-slate-100 text-slate-600"
                          : job.status === "PAUSED"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Applications
            </h2>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View all →
            </button>
          </div>
          {applications.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">
              No applications yet. Publish a job to start receiving candidates!
            </p>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-medium text-sm">
                        {app.fullName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{app.fullName}</p>
                      <p className="text-sm text-slate-500">{app.job.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        app.status === "NEW"
                          ? "bg-blue-100 text-blue-700"
                          : app.status === "CONTACTED"
                            ? "bg-amber-100 text-amber-700"
                            : app.status === "QUALIFIED"
                              ? "bg-green-100 text-green-700"
                              : app.status === "PLACED"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {app.status}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatTimeAgo(app.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plan Info */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Current Plan</p>
            <p className="font-semibold text-slate-900">{activePlan}</p>
          </div>
          <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Upgrade →
          </button>
        </div>
      </div>
    </div>
  );
}
