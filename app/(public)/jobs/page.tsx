import { headers } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTenantFromHost } from "@/lib/tenant";
import { DEMO_AGENCY_SLUG } from "@/modules/auth/demo-mode";
import { JobFilters } from "./job-filters";
import { MapPin, FileText, Building, Euro, Clock, Search, ArrowRight, Briefcase, Users, Zap } from "lucide-react";

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
    <div className="min-h-screen bg-slate-50 font-sans">
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
              className="h-20 w-20 object-contain mx-auto mb-8 bg-white p-3 rounded-2xl shadow-xl"
            />
          )}
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
            Trouve ton <span className="relative inline-block">prochain job<span className="absolute bottom-2 left-0 w-full h-3 bg-white/20 rounded-full -z-10"></span></span>
          </h1>
          <p className="text-xl opacity-95 mb-12 max-w-2xl mx-auto font-medium text-white/90 text-balance">
            Des offres d&apos;emploi simples et accessibles dans ta région. 
            Rejoins l&apos;agence <strong>{agency.name}</strong>.
          </p>
        </div>
      </header>

      {/* FILTERS BAR - Floating over the hero/content border */}
      <div className="px-4 -mt-8 relative z-20">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl border border-slate-100 p-2">
          <JobFilters />
        </div>
      </div>

      {/* ================================================================== */}
      {/* OFFRES D'EMPLOI */}
      {/* ================================================================== */}
      <section id="offres" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-slate-400" />
              Offres disponibles
            </h2>
            <span className="text-sm font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
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
                Aucune offre ne correspond à ta recherche
              </h3>
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                Essaie de modifier tes filtres ou reviens plus tard, de nouvelles opportunités arrivent régulièrement !
              </p>
              <a href="/jobs" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white transition-colors hover:opacity-90" style={{ backgroundColor: primaryColor }}>
                Voir toutes les offres
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
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200">
                            <MapPin className="w-3 h-3" /> {job.location}
                          </span>
                        )}
                        {job.contractType && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100">
                            <FileText className="w-3 h-3" /> {formatContractType(job.contractType)}
                          </span>
                        )}
                        {job.sector && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100">
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

                      {/* Points clés */}
                      <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-md">
                          <Zap className="w-3 h-3" />
                          Réponse rapide
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                          <Clock className="w-3 h-3" />
                          35h / semaine
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:min-w-[180px] pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 mt-2 md:mt-0">
                      {formatSalary(job.salaryMin, job.salaryMax, job.currency) ? (
                        <span className="text-lg font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">
                          {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-slate-400 italic">Salaire non précisé</span>
                      )}
                      
                      <span
                        className="inline-flex items-center justify-center text-sm font-bold px-6 py-3 rounded-xl text-white shadow-sm transition-all transform group-hover:translate-x-1"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Postuler
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
      {/* COMMENT ÇA MARCHE */}
      {/* ================================================================== */}
      <section className="py-20 px-4 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-12">
            Comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600">1</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Choisis ta ville</h3>
              <p className="text-slate-600 text-sm">
                Parcours les offres disponibles dans ta région. Tout est trié par proximité.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600">2</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Trouve une offre</h3>
              <p className="text-slate-600 text-sm">
                Lis les détails du poste : horaires, salaire, avantages. Tout est clair et transparent.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600">3</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Postule en 30 secondes</h3>
              <p className="text-slate-600 text-sm">
                Remplis le formulaire rapide. <strong>Pas de CV obligatoire</strong>, on te recontacte vite !
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* POUR QUI ? */}
      {/* ================================================================== */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-8">
            Pour qui ?
          </h2>
          <p className="text-center text-slate-700 mb-8 max-w-2xl mx-auto">
            Que tu cherches ton premier emploi, un job à côté de chez toi, ou une nouvelle opportunité, 
            <strong> on est là pour t&apos;aider</strong>.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "🚚 Manutentionnaire",
              "🍽️ Serveur(se)",
              "🏗️ Ouvrier BTP",
              "🛒 Employé(e) de commerce",
              "🧹 Agent d'entretien",
              "📦 Préparateur de commandes",
              "🎓 Étudiant(e)",
              "🔄 En reconversion",
              "🏠 Aide à domicile",
              "🚗 Livreur(se)",
            ].map((profile) => (
              <span
                key={profile}
                className="bg-white px-4 py-2 rounded-full text-sm text-slate-700 border border-slate-200 shadow-sm"
              >
                {profile}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* POURQUOI NOUS FAIRE CONFIANCE */}
      {/* ================================================================== */}
      <section className="py-16 px-4 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            Pourquoi nous faire confiance ?
          </h2>
          <p className="text-slate-300 mb-10 max-w-2xl mx-auto">
            On connaît le terrain. Notre équipe accompagne les candidats et les entreprises 
            depuis des années avec un objectif simple : <strong className="text-white">te trouver un job qui te convient</strong>.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="mb-4 flex justify-center">
                <Users className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="font-semibold mb-2">Accompagnement humain</h3>
              <p className="text-sm text-slate-400">
                Une vraie personne te répond et t&apos;accompagne dans ta recherche.
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="mb-4 flex justify-center">
                <MapPin className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="font-semibold mb-2">Ancrage local</h3>
              <p className="text-sm text-slate-400">
                On travaille avec des entreprises de ta région qu&apos;on connaît bien.
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="mb-4 flex justify-center">
                <Zap className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="font-semibold mb-2">Réponse rapide</h3>
              <p className="text-sm text-slate-400">
                Pas d&apos;attente interminable. On te recontacte sous 48h max.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FOOTER */}
      {/* ================================================================== */}
      <footer className="py-8 px-4 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              <span className="font-bold text-slate-900">{agency.name}</span>
              <span className="mx-2 text-slate-300">|</span>
              <a href="mailto:contact@example.com" className="text-slate-500 hover:text-indigo-600 transition-colors">
                Nous contacter
              </a>
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-slate-900">Mentions légales</a>
              <a href="#" className="hover:text-slate-900">Confidentialité</a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            Propulsé par{" "}
            <a
              href="https://questhire.com"
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              QuestHire
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
