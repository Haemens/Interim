import Link from "next/link";
import { db } from "@/lib/db";
import { getEffectiveTenant } from "@/lib/get-effective-tenant";

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getAgencyData(agencyId: string) {
  const agency = await db.agency.findUnique({
    where: { id: agencyId },
    include: {
      subscriptions: {
        where: { status: "ACTIVE" },
        take: 1,
      },
    },
  });

  return agency;
}

async function getJobsWithStats(agencyId: string) {
  const jobs = await db.job.findMany({
    where: { agencyId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  return jobs;
}

async function getRecentApplications(agencyId: string) {
  const applications = await db.application.findMany({
    where: { agencyId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      job: {
        select: { title: true },
      },
    },
  });

  return applications;
}

async function getStats(agencyId: string) {
  const [activeJobs, totalApplications, newApplications, placedCount] =
    await Promise.all([
      db.job.count({ where: { agencyId, status: "ACTIVE" } }),
      db.application.count({ where: { agencyId } }),
      db.application.count({ where: { agencyId, status: "NEW" } }),
      db.application.count({ where: { agencyId, status: "PLACED" } }),
    ]);

  return [
    { label: "Active Jobs", value: activeJobs.toString(), change: "published" },
    {
      label: "Total Applications",
      value: totalApplications.toString(),
      change: `${newApplications} new`,
    },
    { label: "New Candidates", value: newApplications.toString(), change: "to review" },
    { label: "Placements", value: placedCount.toString(), change: "successful" },
  ];
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `il y a ${diffMins}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  return `il y a ${diffDays}j`;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function DashboardPage() {
  const { agency: tenantAgency } = await getEffectiveTenant();

  // If no agency found, show placeholder
  if (!tenantAgency) {
    return (
      <div className="space-y-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-amber-800">
            Aucune agence trouvée
          </h2>
          <p className="text-amber-700 mt-1">
            Veuillez vous connecter pour accéder au tableau de bord.
          </p>
        </div>
      </div>
    );
  }

  const agency = await getAgencyData(tenantAgency.id);

  if (!agency) {
    return (
      <div className="space-y-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-amber-800">
            Agence introuvable
          </h2>
          <p className="text-amber-700 mt-1">
            Impossible de charger les données de l&apos;agence.
          </p>
        </div>
      </div>
    );
  }

  // Fetch all data in parallel
  const [jobs, applications, stats] = await Promise.all([
    getJobsWithStats(agency.id),
    getRecentApplications(agency.id),
    getStats(agency.id),
  ]);

  const activePlan = agency.subscriptions[0]?.plan || "STARTER";

  // Translate stats labels
  const translatedStats = stats.map(stat => {
    let label = stat.label;
    let change = stat.change;

    if (label === "Active Jobs") label = "Offres actives";
    if (label === "Total Applications") label = "Total candidatures";
    if (label === "New Candidates") label = "Candidatures à traiter";
    if (label === "Placements") label = "Recrutements";

    if (change === "published") change = "publié";
    if (change.includes("new")) change = change.replace("new", "nouveau(x)");
    if (change === "to review") change = "à examiner";
    if (change === "successful") change = "réussi(s)";

    return { ...stat, label, change };
  });

  // Helper for status translation
  const translateJobStatus = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: "Brouillon",
      ACTIVE: "Active",
      PAUSED: "En pause",
      ARCHIVED: "Archivée"
    };
    return map[status] || status;
  };

  const translateAppStatus = (status: string) => {
    const map: Record<string, string> = {
      NEW: "Nouveau",
      CONTACTED: "Contacté",
      QUALIFIED: "Qualifié",
      PLACED: "Recruté",
      REJECTED: "Refusé"
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bienvenue chez {agency.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          Voici ce qui se passe chez{" "}
          <span className="font-semibold text-primary">{agency.slug}</span> aujourd&apos;hui.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {translatedStats.map((stat, index) => {
          // Colors configuration
          const colors = [
            { border: "border-l-emerald-500", darkFrom: "dark:from-emerald-950/40", darkTo: "dark:to-teal-950/40", darkBorder: "dark:border-emerald-900", darkText: "dark:text-emerald-400", darkValue: "dark:text-emerald-100" },
            { border: "border-l-blue-500", darkFrom: "dark:from-blue-950/40", darkTo: "dark:to-indigo-950/40", darkBorder: "dark:border-blue-900", darkText: "dark:text-blue-400", darkValue: "dark:text-blue-100" },
            { border: "border-l-amber-500", darkFrom: "dark:from-amber-950/40", darkTo: "dark:to-orange-950/40", darkBorder: "dark:border-amber-900", darkText: "dark:text-amber-400", darkValue: "dark:text-amber-100" },
            { border: "border-l-purple-500", darkFrom: "dark:from-purple-950/40", darkTo: "dark:to-pink-950/40", darkBorder: "dark:border-purple-900", darkText: "dark:text-purple-400", darkValue: "dark:text-purple-100" },
          ];
          
          const c = colors[index % colors.length];
          
          return (
            <div
              key={stat.label}
              className={`p-6 rounded-xl shadow-sm relative overflow-hidden bg-white border-l-4 ${c.border} dark:bg-gradient-to-br ${c.darkFrom} ${c.darkTo} dark:border-l-0 border dark:border ${c.darkBorder}`}
            >
              <p className={`text-sm font-medium text-slate-600 ${c.darkText}`}>{stat.label}</p>
              <p className={`text-3xl font-bold mt-1 text-slate-900 ${c.darkValue}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-foreground">Offres récentes</h2>
            <Link href="/dashboard/jobs" className="text-sm text-primary hover:text-primary/90 font-medium">
              Tout voir →
            </Link>
          </div>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              Pas encore d&apos;offre. Créez votre première annonce !
            </p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{job.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {job._count.applications} candidature
                      {job._count.applications !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      job.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : job.status === "DRAFT"
                          ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          : job.status === "PAUSED"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                            : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {translateJobStatus(job.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Applications */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Candidatures récentes
            </h2>
            <Link href="/dashboard/candidates" className="text-sm text-primary hover:text-primary/90 font-medium">
              Tout voir →
            </Link>
          </div>
          {applications.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              Pas encore de candidature. Publiez une offre pour recevoir des candidats !
            </p>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium text-sm">
                        {app.fullName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{app.fullName}</p>
                      <p className="text-sm text-muted-foreground">{app.job.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        app.status === "NEW"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                          : app.status === "CONTACTED"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                            : app.status === "QUALIFIED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                              : app.status === "PLACED"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                                : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {translateAppStatus(app.status)}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(app.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plan Info */}
      <div className="bg-secondary/50 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Forfait actuel</p>
            <p className="font-semibold text-foreground">{activePlan}</p>
          </div>
          <Link href="/dashboard/billing" className="text-sm text-primary hover:text-primary/90 font-medium">
            Mettre à niveau →
          </Link>
        </div>
      </div>
    </div>
  );
}
