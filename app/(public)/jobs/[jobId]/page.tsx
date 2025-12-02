import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTenantFromHost } from "@/lib/tenant";
import { DEMO_AGENCY_SLUG } from "@/modules/auth/demo-mode";
import { ApplicationForm } from "./application-form";
import { MapPin, FileText, Building, Euro, ArrowLeft, CheckCircle2 } from "lucide-react";

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
  const curr = currency || "€";
  if (min && max) {
    return `${min.toLocaleString("fr-FR")} - ${max.toLocaleString("fr-FR")} ${curr}`;
  }
  if (min) return `À partir de ${min.toLocaleString("fr-FR")} ${curr}`;
  if (max) return `Jusqu'à ${max.toLocaleString("fr-FR")} ${curr}`;
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
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header
        className="py-12 px-4 relative overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <Link
            href="/jobs"
            className="inline-flex items-center text-white/80 hover:text-white text-sm mb-6 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour aux offres
          </Link>
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
            {job.title}
          </h1>
          
          <div className="flex flex-wrap gap-3 text-white/90 text-sm font-medium">
            {job.location && (
              <span className="flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-lg backdrop-blur-sm">
                <MapPin className="w-4 h-4" /> {job.location}
              </span>
            )}
            {job.contractType && (
              <span className="flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-lg backdrop-blur-sm">
                <FileText className="w-4 h-4" /> {job.contractType === "FULL_TIME" ? "CDI" : job.contractType}
              </span>
            )}
            {job.sector && (
              <span className="flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-lg backdrop-blur-sm">
                <Building className="w-4 h-4" /> {job.sector}
              </span>
            )}
            {salary && (
              <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-lg backdrop-blur-sm text-white">
                <Euro className="w-4 h-4" /> {salary}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 -mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                Description du poste
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                <p className="whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>
            </section>

            {/* Profile */}
            {job.profile && (
              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  Profil recherché
                </h2>
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                  <p className="whitespace-pre-wrap">
                    {job.profile}
                  </p>
                </div>
              </section>
            )}

            {/* Benefits */}
            {job.benefits && (
              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  Avantages
                </h2>
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed">
                  <p className="whitespace-pre-wrap">
                    {job.benefits}
                  </p>
                </div>
              </section>
            )}

            {/* Tags */}
            {job.tags.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  Compétences
                </h2>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-sm bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-slate-400" />
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
              <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-center">Postuler à cette offre</h3>
                  <p className="text-xs text-center text-slate-500 mt-1">Simple, rapide, sans compte</p>
                </div>
                <div className="p-6">
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
              
              <div className="mt-6 text-center">
                <p className="text-xs text-slate-400">
                  En postulant, vous acceptez notre politique de confidentialité.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 text-center text-sm text-slate-500 border-t border-slate-200 bg-white mt-12">
        <p>
          Propulsé par{" "}
          <a
            href="https://questhire.com"
            className="text-indigo-600 hover:text-indigo-700 font-bold"
          >
            QuestHire
          </a>
        </p>
      </footer>
    </div>
  );
}
