import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTenantFromHost } from "@/lib/tenant";
import { DEMO_AGENCY_SLUG } from "@/modules/auth/demo-mode";
import { ApplicationForm } from "./application-form";

interface JobDetailPageProps {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getJobData(tenantSlug: string | null, jobId: string) {
  if (!tenantSlug) return null;

  const agency = await db.agency.findUnique({
    where: { slug: tenantSlug },
  });

  if (!agency) return null;

  const job = await db.job.findFirst({
    where: {
      id: jobId,
      agencyId: agency.id,
      status: "ACTIVE",
    },
  });

  if (!job) return null;

  return { agency, job };
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

export default async function JobDetailPage({ params, searchParams }: JobDetailPageProps) {
  const { jobId } = await params;
  const resolvedSearchParams = await searchParams;
  const headersList = await headers();
  const host = headersList.get("host") || "";
  
  // Get tenant from host, fallback to demo agency for Vercel deployments without subdomains
  let tenantSlug = getTenantFromHost(host);
  if (!tenantSlug) {
    tenantSlug = DEMO_AGENCY_SLUG;
  }

  const data = await getJobData(tenantSlug, jobId);

  if (!data) {
    notFound();
  }

  const { agency, job } = data;
  const primaryColor = agency.primaryColor || "#4F46E5";
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);

  // Extract source tracking params
  const source = typeof resolvedSearchParams.source === "string" ? resolvedSearchParams.source : undefined;
  const sourceDetail = typeof resolvedSearchParams.sourceDetail === "string" ? resolvedSearchParams.sourceDetail : undefined;
  const channelId = typeof resolvedSearchParams.channelId === "string" ? resolvedSearchParams.channelId : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="py-8 px-4"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-4xl mx-auto">
          <Link
            href="/jobs"
            className="text-white/80 hover:text-white text-sm mb-4 inline-block"
          >
            ← Back to all jobs
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {job.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-white/90 text-sm">
            {job.location && (
              <span className="flex items-center gap-1">📍 {job.location}</span>
            )}
            {job.contractType && (
              <span className="flex items-center gap-1">📄 {job.contractType}</span>
            )}
            {job.sector && (
              <span className="flex items-center gap-1">🏢 {job.sector}</span>
            )}
            {salary && (
              <span className="flex items-center gap-1">💰 {salary}</span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <section className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Job Description
              </h2>
              <div className="prose prose-slate max-w-none">
                <p className="whitespace-pre-wrap text-slate-600">
                  {job.description}
                </p>
              </div>
            </section>

            {/* Profile */}
            {job.profile && (
              <section className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Required Profile
                </h2>
                <div className="prose prose-slate max-w-none">
                  <p className="whitespace-pre-wrap text-slate-600">
                    {job.profile}
                  </p>
                </div>
              </section>
            )}

            {/* Benefits */}
            {job.benefits && (
              <section className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Benefits
                </h2>
                <div className="prose prose-slate max-w-none">
                  <p className="whitespace-pre-wrap text-slate-600">
                    {job.benefits}
                  </p>
                </div>
              </section>
            )}

            {/* Tags */}
            {job.tags.length > 0 && (
              <section className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-sm bg-slate-100 text-slate-700 px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Application Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <ApplicationForm
                jobId={job.id}
                jobTitle={job.title}
                agencyName={agency.name}
                primaryColor={primaryColor}
                source={source}
                sourceDetail={sourceDetail}
                channelId={channelId}
              />
            </div>
          </div>
        </div>
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
