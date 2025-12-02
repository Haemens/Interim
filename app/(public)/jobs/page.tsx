import { headers } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTenantFromHost } from "@/lib/tenant";
import { DEMO_AGENCY_SLUG } from "@/modules/auth/demo-mode";

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

import { JobFilters } from "./job-filters";

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
    <div className="min-h-screen bg-slate-50">
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
              className="h-16 mx-auto mb-8 bg-white/10 p-2 rounded-xl backdrop-blur-sm shadow-lg"
            />
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight tracking-tight">
            Trouve ton <span className="relative inline-block">prochain job<span className="absolute bottom-1 left-0 w-full h-2 bg-white/20 rounded-full"></span></span> près de chez toi
          </h1>
          <p className="text-xl opacity-95 mb-12 max-w-2xl mx-auto font-medium text-white/90">
            Des offres d&apos;emploi simples et accessibles dans ta région. 
            Pas besoin de CV parfait, juste de motivation !
          </p>
        </div>
      </header>

      {/* FILTERS BAR - Floating over the hero/content border */}
      <div className="px-4">
        <JobFilters />
      </div>

      {/* ================================================================== */}
      {/* OFFRES D'EMPLOI */}
      {/* ================================================================== */}
      <section id="offres" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Offres d&apos;emploi
            </h2>
            <p className="text-slate-500 font-medium">
              {jobs.length > 0 
                ? `${jobs.length} offre${jobs.length > 1 ? "s" : ""} disponible${jobs.length > 1 ? "s" : ""}`
                : "0 offre trouvée"
              }
            </p>
          </div>

          {/* Liste des offres */}
          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🔍</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Aucune offre ne correspond à ta recherche
              </h3>
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                Essaie de modifier tes filtres ou reviens plus tard, de nouvelles opportunités arrivent régulièrement !
              </p>
              <a href="/jobs" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors">
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
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

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
                            📍 {job.location}
                          </span>
                        )}
                        {job.contractType && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100">
                            📄 {formatContractType(job.contractType)}
                          </span>
                        )}
                        {job.sector && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100">
                            🏢 {job.sector}
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
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Réponse rapide
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Sans CV
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
                        <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
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
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600">1</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Choisis ta ville</h3>
              <p className="text-slate-600 text-sm">
                Parcours les offres disponibles dans ta région. Tout est trié par proximité.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600">2</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Trouve une offre</h3>
              <p className="text-slate-600 text-sm">
                Lis les détails du poste : horaires, salaire, avantages. Tout est clair et transparent.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
      <section className="py-16 px-4 bg-slate-100">
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
                className="bg-white px-4 py-2 rounded-full text-sm text-slate-700 border border-slate-200"
              >
                {profile}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* OFFRES D'EMPLOI */}
      {/* ================================================================== */}
      <section id="offres" className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-4">
            Offres d&apos;emploi
          </h2>
          <p className="text-center text-slate-600 mb-8">
            {jobs.length > 0 
              ? `${jobs.length} offre${jobs.length > 1 ? "s" : ""} disponible${jobs.length > 1 ? "s" : ""} en ce moment`
              : "Aucune offre pour le moment, reviens bientôt !"
            }
          </p>

          {/* Filtres (placeholder - à implémenter côté client) */}
          <div className="bg-slate-50 rounded-xl p-4 mb-8 border border-slate-200">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3">
                <span className="text-sm text-slate-500 font-medium">Filtres :</span>
                <span className="text-xs bg-white px-3 py-1.5 rounded-full border border-slate-200 text-slate-600">
                  📍 Ville / Zone
                </span>
                <span className="text-xs bg-white px-3 py-1.5 rounded-full border border-slate-200 text-slate-600">
                  📄 Type de contrat
                </span>
                <span className="text-xs bg-white px-3 py-1.5 rounded-full border border-slate-200 text-slate-600">
                  🏢 Secteur
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-slate-500">Trier par :</span>
                <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700">
                  <option>Plus récentes</option>
                  <option>Meilleur salaire</option>
                  <option>Près de chez moi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Liste des offres */}
          {jobs.length === 0 ? (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-12 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Pas d&apos;offres pour le moment
              </h3>
              <p className="text-slate-600">
                Reviens bientôt, de nouvelles opportunités arrivent régulièrement !
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job: Job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                        {job.title}
                      </h3>
                      
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {job.location && (
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                            📍 {job.location}
                          </span>
                        )}
                        {job.contractType && (
                          <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                            {formatContractType(job.contractType)}
                          </span>
                        )}
                        {job.sector && (
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                            {job.sector}
                          </span>
                        )}
                      </div>

                      {/* Description courte */}
                      {job.description && (
                        <p className="text-sm text-slate-600 mb-3">
                          {truncateDescription(job.description)}
                        </p>
                      )}

                      {/* Points clés (placeholder) */}
                      <ul className="text-xs text-slate-500 space-y-1">
                        <li>✓ Réponse rapide garantie</li>
                        <li>✓ Pas de CV obligatoire</li>
                      </ul>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-3 md:min-w-[160px]">
                      {formatSalary(job.salaryMin, job.salaryMax, job.currency) && (
                        <span className="text-lg font-bold text-slate-900">
                          {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                        </span>
                      )}
                      <span
                        className="inline-block text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-transform group-hover:scale-105"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Postuler en 30 sec →
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
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="text-3xl mb-3">🤝</div>
              <h3 className="font-semibold mb-2">Accompagnement humain</h3>
              <p className="text-sm text-slate-400">
                Une vraie personne te répond et t&apos;accompagne dans ta recherche.
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="text-3xl mb-3">📍</div>
              <h3 className="font-semibold mb-2">Ancrage local</h3>
              <p className="text-sm text-slate-400">
                On travaille avec des entreprises de ta région qu&apos;on connaît bien.
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="text-3xl mb-3">⚡</div>
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
      <footer className="py-8 px-4 bg-slate-100 border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              <span className="font-medium">{agency.name}</span>
              {" • "}
              <a href="mailto:contact@example.com" className="text-indigo-600 hover:underline">
                contact@example.com
              </a>
            </div>
            <div className="flex gap-4 text-sm text-slate-500">
              <a href="#" className="hover:text-slate-700">Mentions légales</a>
              <a href="#" className="hover:text-slate-700">CGU</a>
              <a href="#" className="hover:text-slate-700">Politique de confidentialité</a>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
            Propulsé par{" "}
            <a
              href="https://questhire.com"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              QuestHire
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
