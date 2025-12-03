import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicJobs, getPublicAgency } from "@/modules/job/public-queries";
import { MapPin, FileText, Building, Euro, Search, ArrowRight, Briefcase } from "lucide-react";
import { PublicFooter } from "../../components/public-footer";
import { getTenantUrl } from "@/lib/tenant-utils";

// Reusing helpers (could be moved to shared utils)
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

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agency = await getPublicAgency(slug);
  if (!agency) return {};
  return {
    title: `Offres d'emploi chez ${agency.name} - QuestHire`,
    description: `Découvrez les offres d'emploi proposées par ${agency.name}.`,
  };
}

export default async function AgencyPublicHubPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page } = await searchParams;
  
  const agency = await getPublicAgency(slug);
  if (!agency) {
    notFound();
  }

  const jobsData = await getPublicJobs({ agencySlug: slug }, { page: parseInt(page || "1", 10), pageSize: 20 });
  const { jobs } = jobsData;

  const primaryColor = agency.primaryColor || "#4F46E5";

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* HERO SECTION */}
      <header
        className="py-20 px-4 relative overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
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
            {agency.name}
          </h1>
          <div className="flex justify-center gap-4">
            <Link 
              href={getTenantUrl(agency.slug)}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-full backdrop-blur-sm transition-colors text-sm font-medium"
            >
              Visiter le site de l'agence
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-slate-400" />
                Nos offres ({jobs.length})
              </h2>
            </div>

            {jobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Aucune offre active
                </h3>
                <p className="text-slate-600">
                  Cette agence n'a pas d'offres publiées pour le moment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    // Link to the agency's subdomain job page with source tracking
                    href={getTenantUrl(agency.slug, `/jobs/${job.id}?source=portal&sourceDetail=agency_hub_page`)}
                    className="block bg-white rounded-2xl border border-slate-200 p-6 md:p-8 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: primaryColor }}></div>

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">
                          {job.title}
                        </h3>
                        
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

                        {job.description && (
                          <p className="text-sm text-slate-600 mb-4 leading-relaxed line-clamp-2">
                            {job.description.substring(0, 160)}...
                          </p>
                        )}
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:min-w-[180px]">
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
      </main>

      <PublicFooter agencyName={agency.name} />
    </div>
  );
}
