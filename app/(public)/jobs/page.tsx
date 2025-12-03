import { headers } from "next/headers";
import { Metadata } from "next";
import { getTenantFromHost } from "@/lib/tenant-utils";
import { AgencyView } from "./agency-view";
import { GlobalView } from "./global-view";
import { db } from "@/lib/db";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    sector?: string;
    location?: string;
    page?: string;
  }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const tenantSlug = getTenantFromHost(host);

  if (tenantSlug) {
    const agency = await db.agency.findUnique({
      where: { slug: tenantSlug },
      select: { name: true }
    });
    
    if (agency) {
      return {
        title: `Carrières chez ${agency.name} - Offres d'emploi`,
        description: `Découvrez toutes les offres d'emploi chez ${agency.name} et postulez dès maintenant.`,
      };
    }
  }

  return {
    title: "Trouver un job - QuestHire",
    description: "Parcourez des milliers d'offres d'intérim, CDD et CDI dans les meilleures agences de recrutement.",
  };
}

export default async function PublicJobsPage({ searchParams }: PageProps) {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const resolvedSearchParams = await searchParams;
  
  const tenantSlug = getTenantFromHost(host);

  if (tenantSlug) {
    return <AgencyView tenantSlug={tenantSlug} searchParams={resolvedSearchParams} />;
  }

  return <GlobalView searchParams={resolvedSearchParams} />;
}
