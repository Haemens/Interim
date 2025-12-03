import { headers } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTenantFromHost } from "@/lib/tenant";
import { DEMO_AGENCY_SLUG } from "@/modules/auth/demo-mode";
import { JobFilters } from "./job-filters";
import { MapPin, FileText, Building, Euro, Clock, Search, ArrowRight, Briefcase, Users, Zap } from "lucide-react";
import { PublicFooter } from "../components/public-footer";

// =============================================================================
// TYPES
// =============================================================================

interface Job {
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  sector: string | null;
  description: string | null;
  publishedAt: Date | null;
}

interface JobFilters {
  q?: string;
  type?: string;
  sector?: string;
  location?: string;
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getAgencyAndJobs(tenantSlug: string | null, filters: JobFilters = {}) {
  if (!tenantSlug) return null;

  const agency = await db.agency.findUnique({
    where: { slug: tenantSlug },
  });

  if (!agency) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    agencyId: agency.id,
    status: "ACTIVE",
  };

  // Apply search filter (title or location)
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { location: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  // Apply contract type filter
  if (filters.type) {
    where.contractType = filters.type;
  }

  // Apply sector filter
  if (filters.sector) {
    where.sector = filters.sector;
  }

  const jobs = await db.job.findMany({
    where,
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
      description: true,
      publishedAt: true,
    },
  });

  return { agency, jobs };
}

// =============================================================================
// HELPERS
// =============================================================================

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

function truncateDescription(desc: string | null, maxLength: number = 120): string {
  if (!desc) return "";
  if (desc.length <= maxLength) return desc;
  return desc.substring(0, maxLength).trim() + "...";
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

interface PageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    sector?: string;
  }>;
}

export default async function PublicJobsPage({ searchParams }: PageProps) {
  // ... logic unchanged
  const resolvedSearchParams = await searchParams;
  const headersList = await headers();
  const host = headersList.get("host") || "";
  
  let tenantSlug = getTenantFromHost(host);
  if (!tenantSlug) {
    tenantSlug = DEMO_AGENCY_SLUG;
  }

  const data = await getAgencyAndJobs(tenantSlug, {
    q: resolvedSearchParams.q,
    type: resolvedSearchParams.type,
    sector: resolvedSearchParams.sector,
  });

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Agence introuvable</h1>
          <p className="text-slate-600">
            L&apos;agence que vous recherchez n&apos;existe pas.
          </p>
        </div>
      </div>
    );
  }

  const { agency, jobs } = data;
  const primaryColor = agency.primaryColor || "#4F46E5";

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* ================================================================== */}
      {/* HERO SECTION */}
      {/* ================================================================== */}
      <header
        className="py-20 px-4 relative overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <div className="max-w-4xl mx-auto text-center text-white relative z-10">
          {agency.logoUrl && (
            <img
              src={agency.logoUrl}
              alt={agency.name}
              className="h-24 w-auto max-w-[200px] object-contain mx-auto mb-8 bg-white/10 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-white/20"
            />
          )}
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
            {agency.name} recrute
          </h1>
          <p className="text-xl opacity-95 mb-8 max-w-2xl mx-auto font-medium text-white/90 text-balance">
            Découvrez nos dernières opportunités et trouvez le poste qui vous correspond.
          </p>
        </div>
      </header>

      {/* FILTERS BAR - Floating over the hero/content border */}
      <div className="px-4 -mt-8 relative z-20 mb-12">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl border border-slate-100 p-4">
          <JobFilters />
        </div>
      </div>

      <main className="flex-grow">
        {/* ================================================================== */}
        {/* OFFRES D'EMPLOI */}
        {/* ================================================================== */}
        <section id="offres" className="pb-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-slate-400" />
                Nos offres d&apos;emploi
              </h2>
              <span className="text-sm font-medium bg-white text-slate-600 px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                {jobs.length} poste{jobs.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Liste des offres */}
            {jobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Aucune offre trouvée
                </h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  Essayez de modifier vos filtres de recherche.
                </p>
                <a href="/jobs" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white transition-colors hover:opacity-90" style={{ backgroundColor: primaryColor }}>
                  Réinitialiser les filtres
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job: Job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="block bg-white rounded-2xl border border-slate-200 p-6 md:p-8 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                  >
                    {/* Hover accent line */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: primaryColor }}></div>

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-start justify-between md:block">
                          <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">
                            {job.title}
                          </h3>
                        </div>
                        
                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {job.location && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200">
                              <MapPin className="w-3 h-3" /> {job.location}
                            </span>
                          )}
                          {job.contractType && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200">
                              <FileText className="w-3 h-3" /> {formatContractType(job.contractType)}
                            </span>
                          )}
                          {job.sector && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200">
                              <Building className="w-3 h-3" /> {job.sector}
                            </span>
                          )}
                        </div>

                        {/* Description courte */}
                        {job.description && (
                          <p className="text-sm text-slate-600 mb-4 leading-relaxed line-clamp-2">
                            {truncateDescription(job.description, 160)}
                          </p>
                        )}

                        <div className="flex items-center text-xs text-slate-400 font-medium">
                          Publié le {job.publishedAt ? new Date(job.publishedAt).toLocaleDateString("fr-FR") : "Récemment"}
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:min-w-[180px] pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 mt-2 md:mt-0">
                        {formatSalary(job.salaryMin, job.salaryMax, job.currency) ? (
                          <span className="text-lg font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg whitespace-nowrap">
                            {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-slate-400 italic">Salaire non précisé</span>
                        )}
                        
                        <span
                          className="inline-flex items-center justify-center text-sm font-bold px-6 py-3 rounded-xl text-white shadow-sm transition-all transform group-hover:translate-x-1 whitespace-nowrap"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Voir l&apos;offre
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ================================================================== */}
        {/* FEATURES */}
        {/* ================================================================== */}
        <section className="py-16 px-4 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6 rounded-2xl bg-slate-50">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Candidature simple</h3>
                <p className="text-slate-600 text-sm">
                  Postulez en quelques clics, sans création de compte obligatoire.
                </p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-slate-50">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Suivi humain</h3>
                <p className="text-slate-600 text-sm">
                  Une équipe dédiée étudie votre candidature rapidement.
                </p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-slate-50">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Offres locales</h3>
                <p className="text-slate-600 text-sm">
                  Des opportunités près de chez vous dans des entreprises de confiance.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter agencyName={agency.name} />
    </div>
  );
}
