import Link from "next/link";
import { MapPin, Search, Briefcase, Building2, ArrowRight, Clock, Euro, Filter } from "lucide-react";
import { getPublicJobs } from "@/modules/job/public-queries";
import { getTenantUrl } from "@/lib/tenant-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PublicFooter } from "@/components/public/footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// =============================================================================
// HELPERS
// =============================================================================

function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
  if (!min && !max) return null;
  const curr = currency || "€";
  if (min && max) {
    return `${min.toLocaleString("fr-FR")} - ${max.toLocaleString("fr-FR")} ${curr}`;
  }
  if (min) return `> ${min.toLocaleString("fr-FR")} ${curr}`;
  if (max) return `< ${max.toLocaleString("fr-FR")} ${curr}`;
  return null;
}

function formatContractType(type: string | null): string {
  const types: Record<string, string> = {
    FULL_TIME: "CDI",
    PART_TIME: "Part-time",
    CONTRACT: "CDD",
    FREELANCE: "Freelance",
    INTERNSHIP: "Stage",
    INTERIM: "Intérim",
  };
  return type && types[type] ? types[type] : type || "";
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  return `Il y a ${diffDays} jours`;
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
  
  // Fetch jobs
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

  // Popular sectors for the "Popular searches" section
  const popularSectors = [
    { id: "LOGISTICS", label: "Logistique" },
    { id: "RETAIL", label: "Commerce" },
    { id: "INDUSTRY", label: "Industrie" },
    { id: "HOSPITALITY", label: "Hôtellerie" },
    { id: "CONSTRUCTION", label: "BTP" },
    { id: "ADMIN", label: "Administratif" },
  ];

  // Filter pills for the second row of search
  const filterPills = [
    { label: "Logement fourni", count: 12 },
    { label: "Nuit", count: 8 },
    { label: "Week-end", count: 24 },
    { label: "Télétravail possible", count: 5 },
  ];

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col pt-16">
      {/* HERO SECTION */}
      <section className="relative py-16 md:py-24 px-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-5xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
            Trouvez votre prochaine <span className="text-indigo-600">mission d&apos;intérim</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Accédez à des milliers d&apos;offres d&apos;emploi vérifiées auprès des meilleures agences de recrutement.
          </p>
        </div>

        {/* SEARCH MODULE */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-4 md:p-6 relative z-10">
          <form action="/jobs" method="GET">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
              {/* Keyword Input */}
              <div className="md:col-span-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input 
                  name="q" 
                  defaultValue={searchParams.q} 
                  placeholder="Métier, mot-clé ou entreprise" 
                  className="pl-10 h-12 text-base border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Location Input */}
              <div className="md:col-span-3 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input 
                  name="location" 
                  defaultValue={searchParams.location} 
                  placeholder="Ville ou code postal" 
                  className="pl-10 h-12 text-base border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Job Type Select */}
              <div className="md:col-span-3">
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                  <select 
                    name="type" 
                    defaultValue={searchParams.type}
                    className="w-full h-12 pl-10 pr-4 appearance-none bg-slate-50 border border-slate-200 rounded-md text-base text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer"
                  >
                    <option value="">Tous types</option>
                    <option value="INTERIM">Intérim</option>
                    <option value="CONTRACT">CDD</option>
                    <option value="FULL_TIME">CDI</option>
                  </select>
                </div>
              </div>

              {/* Search Button */}
              <div className="md:col-span-2">
                <Button type="submit" className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5">
                  Rechercher
                </Button>
              </div>
            </div>

            {/* Secondary Filters */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {filterPills.map((pill, idx) => (
                <button 
                  key={idx}
                  type="button" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50 text-sm font-medium text-slate-600 transition-colors whitespace-nowrap"
                >
                  {pill.label}
                  <span className="bg-slate-100 text-slate-500 text-xs px-1.5 py-0.5 rounded-full">{pill.count}</span>
                </button>
              ))}
              <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
              <button type="button" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 whitespace-nowrap">
                <Filter className="w-4 h-4" />
                Tous les filtres
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* BANNER */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#FFDE59] rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between relative overflow-hidden shadow-lg">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-20 rounded-full -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black opacity-5 rounded-full translate-y-1/3 -translate-x-1/3"></div>

            <div className="relative z-10 max-w-xl">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Arrêtez de chercher.
              </h2>
              <p className="text-lg font-medium text-slate-800 mb-8 text-balance">
                Créez votre profil en 2 minutes et laissez les meilleures agences vous proposer des missions qui vous correspondent.
              </p>
              <Link href="/signup">
                <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 h-14 px-8 text-lg rounded-full shadow-xl">
                  Créer mon profil candidat
                </Button>
              </Link>
            </div>
            
            <div className="relative z-10 mt-8 md:mt-0 hidden md:block">
               {/* Illustration placeholder */}
               <div className="w-64 h-64 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/50 shadow-inner">
                  <Briefcase className="w-24 h-24 text-slate-900 opacity-80" />
               </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-grow pb-20">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* POPULAR SEARCHES */}
          <div className="mb-10 border-b border-slate-100">
            <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide pb-4">
              <Link 
                href="/jobs"
                className={`whitespace-nowrap pb-3 text-sm font-bold border-b-2 transition-colors ${!searchParams.sector ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
              >
                Toutes les offres
              </Link>
              {popularSectors.map((sector) => (
                <Link
                  key={sector.id}
                  href={`/jobs?sector=${sector.id}`}
                  className={`whitespace-nowrap pb-3 text-sm font-bold border-b-2 transition-colors ${searchParams.sector === sector.id ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
                >
                  {sector.label}
                </Link>
              ))}
            </div>
          </div>

          {/* JOB COUNT & SORT */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-slate-500 font-medium">
              <span className="text-slate-900 font-bold">{total}</span> offres disponibles
            </p>
            <select className="bg-transparent text-sm font-medium text-slate-600 outline-none cursor-pointer hover:text-slate-900">
              <option>Les plus récentes</option>
              <option>Pertinence</option>
              <option>Salaire décroissant</option>
            </select>
          </div>

          {/* JOB GRID */}
          {jobs.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-100">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Aucune offre trouvée</h3>
              <p className="text-slate-500 mb-6">Essayez d&apos;élargir vos critères de recherche.</p>
              <Link href="/jobs">
                <Button variant="outline">Effacer les filtres</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => {
                const jobUrl = getTenantUrl(
                  job.agency.slug, 
                  `/jobs/${job.id}?source=portal&sourceDetail=global_jobs_page`
                );

                return (
                  <Link key={job.id} href={jobUrl} className="group h-full block">
                    <Card className="h-full border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col bg-white">
                      {/* Card Header with Image/Placeholder */}
                      <div className="h-32 bg-gradient-to-r from-slate-100 to-slate-200 relative overflow-hidden group-hover:from-indigo-50 group-hover:to-indigo-100 transition-colors">
                        {job.agency.logoUrl ? (
                           <div className="absolute inset-0 flex items-center justify-center opacity-10 scale-150 blur-sm">
                              <img src={job.agency.logoUrl} alt="" className="w-full h-full object-cover" />
                           </div>
                        ) : (
                          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                        )}
                        
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-white/90 text-slate-900 hover:bg-white shadow-sm backdrop-blur-sm font-semibold border-0">
                            {formatContractType(job.contractType)}
                          </Badge>
                        </div>
                        <div className="absolute top-4 right-4 text-xs font-medium text-slate-500 bg-white/90 px-2 py-1 rounded-full backdrop-blur-sm">
                          {getRelativeTime(job.createdAt)}
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-slate-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">
                              {job.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                              <Building2 className="w-3.5 h-3.5" />
                              {job.agency.name}
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-lg border border-slate-100 bg-white shadow-sm flex items-center justify-center flex-shrink-0 p-1 group-hover:border-indigo-100 transition-colors">
                            {job.agency.logoUrl ? (
                              <img src={job.agency.logoUrl} alt={job.agency.name} className="w-full h-full object-contain rounded" />
                            ) : (
                              <span className="text-xs font-bold text-indigo-600">
                                {job.agency.name.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3 mt-auto">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{job.location || "Lieu non précisé"}</span>
                          </div>
                          {job.salaryMin && (
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 bg-slate-50 w-fit px-2 py-1 rounded">
                              <Euro className="w-3.5 h-3.5 text-slate-500" />
                              <span>{formatSalary(job.salaryMin, job.salaryMax, job.currency)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-sm font-medium">
                          <span className="text-slate-500 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                            Voir l&apos;offre <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                          </span>
                          <span className="text-slate-400 group-hover:text-slate-600">
                            Réf. {job.id.substring(0, 6)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {/* PAGINATION */}
          <div className="mt-12 flex justify-center gap-2">
            {page > 1 && (
               <Link href={`/jobs?page=${page - 1}${searchParams.q ? `&q=${searchParams.q}` : ''}`}>
                 <Button variant="outline">Précédent</Button>
               </Link>
            )}
            <Button variant="ghost" disabled>Page {page}</Button>
            {jobs.length === 12 && (
               <Link href={`/jobs?page=${page + 1}${searchParams.q ? `&q=${searchParams.q}` : ''}`}>
                 <Button variant="outline">Suivant</Button>
               </Link>
            )}
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
