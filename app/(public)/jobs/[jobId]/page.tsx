import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTenantFromHost } from "@/lib/tenant";
import { DEMO_AGENCY_SLUG } from "@/modules/auth/demo-mode";
import { ApplicationForm } from "./application-form";
import { MapPin, FileText, Building, Euro, ArrowLeft, CheckCircle2, Calendar, Clock } from "lucide-react";
import { PublicFooter } from "../../components/public-footer";

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

function formatContractType(type: string | null): string {
  if (!type) return "";
  const types: Record<string, string> = {
    FULL_TIME: "CDI",
    PART_TIME: "Temps partiel",
    CONTRACT: "CDD",
    FREELANCE: "Freelance",
    INTERNSHIP: "Stage",
    INTERIM: "Intérim",
  };
  return types[type] || type;
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
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <header
        className="py-16 px-4 relative overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <Link
            href="/"
            className="inline-flex items-center text-white/80 hover:text-white text-sm mb-8 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voir les autres offres
          </Link>
          
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            {job.title}
          </h1>
          
          <div className="flex flex-wrap gap-3 text-white/90 text-sm font-medium">
            {job.location && (
              <span className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <MapPin className="w-4 h-4" /> {job.location}
              </span>
            )}
            {job.contractType && (
              <span className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <FileText className="w-4 h-4" /> {formatContractType(job.contractType)}
              </span>
            )}
            {job.sector && (
              <span className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <Building className="w-4 h-4" /> {job.sector}
              </span>
            )}
            {salary && (
              <span className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm text-white font-bold border border-white/20">
                <Euro className="w-4 h-4" /> {salary}
              </span>
            )}
             <span className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <Clock className="w-4 h-4" /> Publié le {job.publishedAt ? new Date(job.publishedAt).toLocaleDateString("fr-FR") : "Récemment"}
              </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 -mt-10 relative z-20 flex-grow w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <section className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
                <FileText className="w-6 h-6 text-indigo-600" />
                Description du poste
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-base">
                <p className="whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>
            </section>

            {/* Profile */}
            {job.profile && (
              <section className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">
                  Profil recherché
                </h2>
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-base">
                  <p className="whitespace-pre-wrap">
                    {job.profile}
                  </p>
                </div>
              </section>
            )}

            {/* Benefits */}
            {job.benefits && (
              <section className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">
                  Avantages
                </h2>
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-base">
                  <p className="whitespace-pre-wrap">
                    {job.benefits}
                  </p>
                </div>
              </section>
            )}

            {/* Tags */}
            {job.tags.length > 0 && (
              <section className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6">
                  Compétences clés
                </h2>
                <div className="flex flex-wrap gap-3">
                  {job.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full border border-indigo-100 flex items-center gap-2 font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Application Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transform transition-all hover:shadow-2xl">
                <div className="p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-center text-lg">Postuler maintenant</h3>
                  <p className="text-xs text-center text-slate-500 mt-1 font-medium uppercase tracking-wide">Candidature simplifiée</p>
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
              
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 text-center">
                <h4 className="font-semibold text-slate-900 mb-2">Pourquoi postuler ?</h4>
                <ul className="text-sm text-slate-600 space-y-2 text-left inline-block mx-auto">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Réponse rapide garantie</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Accompagnement personnalisé</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Entreprises vérifiées</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter agencyName={agency.name} />
    </div>
  );
}
