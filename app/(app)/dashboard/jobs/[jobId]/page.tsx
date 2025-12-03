import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  MapPin,
  Briefcase,
  Building,
  Clock,
  Users,
  ExternalLink,
  BarChart2,
  List,
  Share2
} from "lucide-react";
import { db } from "@/lib/db";
import { getEffectiveTenant } from "@/lib/get-effective-tenant";
import { isDemoAgencySlug } from "@/modules/auth/demo-mode";
import { EditJobButton } from "./edit-job-form";
import { SocialContentSection } from "./social-content";
import { ClientSelector } from "./client-selector";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getJobData(jobId: string, agencyId: string) {
  const job = await db.job.findFirst({
    where: {
      id: jobId,
      agencyId,
    },
    include: {
      _count: {
        select: {
          applications: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return job;
}

async function getMembership(userId: string, agencySlug: string) {
  const membership = await db.membership.findFirst({
    where: {
      user: { id: userId },
      agency: { slug: agencySlug },
    },
    include: {
      agency: true,
    },
  });

  return membership;
}

async function getApplicationStats(jobId: string) {
  const stats = await db.application.groupBy({
    by: ["status"],
    where: { jobId },
    _count: true,
  });

  return stats.reduce(
    (acc, stat) => {
      acc[stat.status] = stat._count;
      return acc;
    },
    {} as Record<string, number>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  
  // Get tenant with fallback for Vercel deployments without subdomains
  const { tenantSlug, agency, user } = await getEffectiveTenant();

  if (!tenantSlug || !agency || !user) {
    redirect("/login");
  }

  // Get membership
  const membership = await getMembership(user.id, tenantSlug);
  if (!membership) {
    redirect("/login");
  }

  const isDemo = isDemoAgencySlug(tenantSlug);
  let job;

  // Handle Demo Job ID
  if (isDemo && jobId.startsWith("demo-job-")) {
    job = {
      id: jobId,
      title: "Développeur Fullstack (Demo)",
      location: "Paris (Remote)",
      contractType: "CDI",
      salaryMin: 45000,
      salaryMax: 65000,
      currency: "EUR",
      sector: "Tech",
      description: "Ceci est une offre de démonstration générée automatiquement.\n\nDescription du poste :\n- Développement de fonctionnalités\n- Maintenance de l'application\n- Revue de code",
      profile: "Nous recherchons un développeur passionné avec 3 ans d'expérience.",
      benefits: "- Télétravail possible\n- Tickets restaurant\n- Mutuelle",
      tags: ["React", "Node.js", "TypeScript"],
      status: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
      agencyId: membership.agencyId,
      _count: { applications: 0 },
      client: null,
    };
  } else {
    // Get real job data
    job = await getJobData(jobId, membership.agencyId);
  }

  if (!job) {
    notFound();
  }

  // Get application stats
  const stats = await getApplicationStats(jobId);

  const canEdit = ["RECRUITER", "ADMIN", "OWNER"].includes(membership.role);

  // Prepare job data for the edit form
  const jobForEdit = {
    id: job.id,
    title: job.title,
    location: job.location,
    contractType: job.contractType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    currency: job.currency,
    sector: job.sector,
    description: job.description,
    profile: job.profile,
    benefits: job.benefits,
    tags: job.tags,
    status: job.status,
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default"; // Indigo/Primary
      case "DRAFT":
        return "secondary";
      case "PAUSED":
        return "secondary"; // Yellowish handled via custom class if needed, or default to secondary
      case "CLOSED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: "Active",
      DRAFT: "Brouillon",
      PAUSED: "En pause",
      CLOSED: "Fermée",
      ARCHIVED: "Archivée",
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard/jobs" className="hover:text-foreground transition-colors">
              Offres
            </Link>
            <span>/</span>
            <span>{job.title}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {job.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {job.location}
              </div>
            )}
            {job.contractType && (
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" />
                {job.contractType}
              </div>
            )}
            {job.sector && (
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4" />
                {job.sector}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Créé le {new Date(job.createdAt).toLocaleDateString("fr-FR")}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant={getStatusVariant(job.status)} 
            className={`text-sm px-3 py-1 ${
              job.status === "ACTIVE" 
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800" 
                : job.status === "PAUSED"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                : ""
            }`}
          >
            {translateStatus(job.status)}
          </Badge>
          <EditJobButton job={jobForEdit} isDemo={isDemo} canEdit={canEdit} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total candidatures
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{job._count.applications}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Nouveau</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.NEW || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Contacté</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.CONTACTED || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Qualifié</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.QUALIFIED || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Recruté</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.PLACED || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {canEdit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <List className="w-5 h-5" />
                Pipeline Candidats
              </h2>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="bg-white/10 text-white hover:bg-white/20 border-0"
              >
                <Link href={`/dashboard/jobs/${jobId}/pipeline`}>
                  Ouvrir le Pipeline
                </Link>
              </Button>
            </div>
            <p className="text-indigo-100 text-sm">
              Gérez les candidatures, déplacez les candidats entre les étapes et suivez leur progression.
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Campagne & Contenu
              </h2>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="bg-white/10 text-white hover:bg-white/20 border-0"
              >
                <Link href={`/dashboard/jobs/${jobId}/campaign`}>
                  Voir la Campagne
                </Link>
              </Button>
            </div>
            <p className="text-emerald-100 text-sm">
              Générez du contenu IA, planifiez vos publications et suivez les performances.
            </p>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Details) */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Description du poste</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p className="whitespace-pre-wrap leading-relaxed">{job.description}</p>
              </div>
            </CardContent>
          </Card>

          {(job.profile || job.benefits) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {job.profile && (
                <Card>
                  <CardHeader>
                    <CardTitle>Profil recherché</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      <p className="whitespace-pre-wrap leading-relaxed">{job.profile}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {job.benefits && (
                <Card>
                  <CardHeader>
                    <CardTitle>Avantages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      <p className="whitespace-pre-wrap leading-relaxed">{job.benefits}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <SocialContentSection
            jobId={jobId}
            isDemo={isDemo}
            canEdit={canEdit}
          />
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          <ClientSelector
            jobId={jobId}
            currentClientId={job.client?.id || null}
            currentClientName={job.client?.name || null}
            isDemo={isDemo}
            canEdit={canEdit}
          />

          {(job.salaryMin || job.salaryMax) && (
            <Card>
              <CardHeader>
                <CardTitle>Rémunération</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {job.salaryMin && job.salaryMax
                    ? `${job.salaryMin.toLocaleString("fr-FR")} - ${job.salaryMax.toLocaleString("fr-FR")}`
                    : job.salaryMin
                    ? `À partir de ${job.salaryMin.toLocaleString("fr-FR")}`
                    : `Jusqu'à ${job.salaryMax?.toLocaleString("fr-FR")}`}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {job.currency || "EUR"}
                  </span>
                </p>
              </CardContent>
            </Card>
          )}

          {job.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Création</span>
                <span className="font-medium">{new Date(job.createdAt).toLocaleDateString("fr-FR")}</span>
              </div>
              {job.publishedAt && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Publication</span>
                  <span className="font-medium">{new Date(job.publishedAt).toLocaleDateString("fr-FR")}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm border-t pt-4">
                <span className="text-muted-foreground">Dernière mise à jour</span>
                <span className="font-medium">{new Date(job.updatedAt).toLocaleDateString("fr-FR")}</span>
              </div>
            </CardContent>
          </Card>

          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Liens rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href={`/dashboard/shortlists?jobId=${jobId}`}>
                    <Users className="w-4 h-4 mr-2" />
                    Voir les Shortlists
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href={`/jobs/${jobId}`} target="_blank" data-tour="public-page">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Voir la page publique
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href={`/dashboard/jobs/${jobId}/analytics`}>
                    <BarChart2 className="w-4 h-4 mr-2" />
                    Voir les statistiques
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

