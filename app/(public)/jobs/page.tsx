import { headers } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTenantFromHost } from "@/lib/tenant";

async function getAgencyAndJobs(tenantSlug: string | null) {
  if (!tenantSlug) return null;

  const agency = await db.agency.findUnique({
    where: { slug: tenantSlug },
  });

  if (!agency) return null;

  const jobs = await db.job.findMany({
    where: {
      agencyId: agency.id,
      status: "ACTIVE",
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      location: true,
      contractType: true,
      salaryMin: true,
      salaryMax: true,
      currency: true,
      sector: true,
      publishedAt: true,
    },
  });

  return { agency, jobs };
}

function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
  if (!min && !max) return null;
  const curr = currency || "EUR";
  if (min && max) {
    return `${min.toLocaleString()} - ${max.toLocaleString()} ${curr}`;
  }
  if (min) return `From ${min.toLocaleString()} ${curr}`;
  if (max) return `Up to ${max.toLocaleString()} ${curr}`;
  return null;
}

export default async function PublicJobsPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const tenantSlug = getTenantFromHost(host);

  const data = await getAgencyAndJobs(tenantSlug);

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Agency Not Found</h1>
          <p className="text-slate-600">
            The agency you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const { agency, jobs } = data;
  const primaryColor = agency.primaryColor || "#4F46E5";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="py-12 px-4"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-4xl mx-auto text-center text-white">
          {agency.logoUrl && (
            <img
              src={agency.logoUrl}
              alt={agency.name}
              className="h-16 mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold mb-2">{agency.name}</h1>
          <p className="text-lg opacity-90">Career Opportunities</p>
        </div>
      </header>

      {/* Jobs List */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              No Open Positions
            </h2>
            <p className="text-slate-600">
              We don&apos;t have any open positions at the moment.
              <br />
              Check back soon for new opportunities!
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                {jobs.length} Open Position{jobs.length !== 1 ? "s" : ""}
              </h2>
            </div>

            <div className="space-y-4">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            📍 {job.location}
                          </span>
                        )}
                        {job.contractType && (
                          <span className="flex items-center gap-1">
                            📄 {job.contractType}
                          </span>
                        )}
                        {job.sector && (
                          <span className="flex items-center gap-1">
                            🏢 {job.sector}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-2">
                      {formatSalary(job.salaryMin, job.salaryMax, job.currency) && (
                        <span className="text-sm font-medium text-slate-900">
                          {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                        </span>
                      )}
                      <span
                        className="text-sm font-medium px-3 py-1 rounded-full text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        View & Apply →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-slate-500">
        <p>
          Powered by{" "}
          <a
            href="https://questhire.com"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            QuestHire
          </a>
        </p>
      </footer>
    </div>
  );
}
