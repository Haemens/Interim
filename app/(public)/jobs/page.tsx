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

// =============================================================================
// DATA FETCHING
// =============================================================================

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

export default async function PublicJobsPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  
  let tenantSlug = getTenantFromHost(host);
  if (!tenantSlug) {
    tenantSlug = DEMO_AGENCY_SLUG;
  }

  const data = await getAgencyAndJobs(tenantSlug);

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
        className="py-16 px-4"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-4xl mx-auto text-center text-white">
          {agency.logoUrl && (
            <img
              src={agency.logoUrl}
              alt={agency.name}
              className="h-16 mx-auto mb-6"
            />
          )}
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Trouve ton <span className="underline decoration-4 underline-offset-4">prochain job</span> près de chez toi
          </h1>
          <p className="text-lg md:text-xl opacity-95 mb-8 max-w-2xl mx-auto">
            Des offres d&apos;emploi <strong>simples et accessibles</strong> dans ta région. 
            Pas besoin de CV parfait, juste de motivation !
          </p>
          <a
            href="#offres"
            className="inline-block bg-white text-slate-900 font-semibold px-8 py-4 rounded-full text-lg hover:bg-slate-100 transition-colors shadow-lg"
          >
            👉 Voir les offres près de chez toi
          </a>
        </div>
      </header>

      {/* ================================================================== */}
      {/* COMMENT ÇA MARCHE */}
      {/* ================================================================== */}
      <section className="py-16 px-4 bg-white">
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
