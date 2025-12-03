import Link from "next/link";
import { JobFilters } from "./job-filters";
import { MapPin, FileText, Building, Euro, Search, ArrowRight, Briefcase, Zap, Users, Globe } from "lucide-react";
import { PublicFooter } from "../components/public-footer";
import { getPublicJobs } from "@/modules/job/public-queries";
import { getTenantUrl } from "@/lib/tenant-utils";

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
// COMPONENT
// =============================================================================

interface GlobalViewProps {
  searchParams: {
    q?: string;
    type?: string;
    sector?: string;
    location?: string;
    page?: string;
  };
}

export async function GlobalView({ searchParams }: GlobalViewProps) {
  const page = parseInt(searchParams.page || "1", 10);
  const data = await getPublicJobs({
    q: searchParams.q,
    contractType: searchParams.type !== "ALL" ? searchParams.type : undefined,
    sector: searchParams.sector !== "ALL" ? searchParams.sector : undefined,
    location: searchParams.location,
  }, {
    page,
    pageSize: 12
  });

  const { jobs, total } = data;
  const primaryColor = "#0f172a"; // Slate 900 for global brand

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* HERO SECTION */}
      <header
        className="py-24 px-4 relative overflow-hidden bg-slate-900 text-white"
      >
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight text-white">
            Trouvez votre prochaine mission
          </h1>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto font-medium text-blue-100 text-balance">
            Des milliers d'offres d'intérim, CDD et CDI dans les meilleures agences de recrutement.
          </p>
        </div>
      </header>

      {/* FILTERS BAR */}
      <div className="px-4 -mt-8 relative z-20 mb-12">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl border border-slate-100 p-4">
          <JobFilters />
        </div>
      </div>

      <main className="flex-grow">
        {/* OFFRES D'EMPLOI */}
        <section id="offres" className="pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-6 h-6 text-slate-400" />
                Toutes les offres
              </h2>
              <span className="text-sm font-medium bg-white text-slate-600 px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                {total} offre{total > 1 ? "s" : ""} disponible{total > 1 ? "s" : ""}
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
                <Link href="/jobs" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white transition-colors hover:opacity-90 bg-slate-900">
                  Réinitialiser les filtres
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => {
                  // Construct the correct tenant URL for the job details
                  // We link to the agency's public job page: subdomain.domain.com/jobs/jobId
                  // Add source tracking
                  const jobUrl = getTenantUrl(
                    job.agency.slug, 
                    `/jobs/${job.id}?source=portal&sourceDetail=global_jobs_page`
                  );

                  return (
                    <div
                      key={job.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group relative"
                    >
                      {/* Top accent */}
                      <div className="h-1 w-full bg-gradient-to-r from-slate-200 to-slate-100 group-hover:from-indigo-500 group-hover:to-indigo-600 transition-colors"></div>
                      
                      <div className="p-6 flex flex-col flex-grow">
                        {/* Agency Info */}
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-50">
                          {job.agency.logoUrl ? (
                            <img src={job.agency.logoUrl} alt={job.agency.name} className="w-8 h-8 object-contain rounded" />
                          ) : (
                            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-xs font-bold text-slate-500">
                              {job.agency.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-medium text-slate-600 truncate">
                            {job.agency.name}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                          {job.title}
                        </h3>

                        {/* Meta */}
                        <div className="space-y-2 mb-4 flex-grow">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="truncate">{job.location || "Lieu non précisé"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span>{formatContractType(job.contractType)}</span>
                          </div>
                          {job.salaryMin && (
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <Euro className="w-4 h-4 text-slate-400" />
                              <span>{formatSalary(job.salaryMin, job.salaryMax, job.currency)}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 mt-auto">
                          <Link
                            href={jobUrl}
                            className="flex items-center justify-center w-full px-4 py-2.5 bg-slate-50 text-slate-700 font-medium rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors group-hover:bg-indigo-600 group-hover:text-white"
                          >
                            Voir l&apos;offre
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-16 px-4 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6 rounded-2xl bg-slate-50">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Rapidité</h3>
                <p className="text-slate-600 text-sm">
                  Des milliers de nouvelles offres ajoutées chaque jour.
                </p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-slate-50">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Agences vérifiées</h3>
                <p className="text-slate-600 text-sm">
                  Nous travaillons uniquement avec des agences certifiées.
                </p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-slate-50">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Partout en France</h3>
                <p className="text-slate-600 text-sm">
                  Trouvez un emploi près de chez vous, où que vous soyez.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter agencyName="QuestHire" />
    </div>
  );
}
