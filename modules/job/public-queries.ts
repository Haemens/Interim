import { db } from "@/lib/db";
import { JobStatus, Job, Agency } from "@prisma/client";

export interface PublicJobFilters {
  q?: string;
  location?: string;
  contractType?: string;
  sector?: string;
  agencySlug?: string;
}

export interface PublicJobPagination {
  page: number;
  pageSize: number;
}

export interface PublicJob {
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
  agency: {
    name: string;
    slug: string;
    logoUrl: string | null;
  };
}

export interface PublicJobsResult {
  jobs: PublicJob[];
  total: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Get public jobs with filters and pagination
 * Used for the global job board and agency public pages
 */
export async function getPublicJobs(
  filters: PublicJobFilters = {},
  pagination: PublicJobPagination = { page: 1, pageSize: 12 }
): Promise<PublicJobsResult> {
  const { q, location, contractType, sector, agencySlug } = filters;
  const { page, pageSize } = pagination;

  // Build where clause
  const where: any = {
    status: JobStatus.ACTIVE,
    // Ensure agency is not deleted (implied by relation but good to check if we had soft delete)
    // Also check for agency isActive/demo mode constraints if needed
    // For now we show all active jobs from all agencies
  };

  if (agencySlug) {
    where.agency = {
      slug: agencySlug,
    };
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { tags: { hasSome: [q] } }, // Exact match for tags usually, but let's stick to simple text for now
    ];
    // For tags, Prisma "hasSome" expects array. If q is just a string, maybe just search title/desc/sector
    // Let's refine search:
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { sector: { contains: q, mode: "insensitive" } },
    ];
  }

  if (location) {
    where.location = { contains: location, mode: "insensitive" };
  }

  if (contractType) {
    where.contractType = contractType;
  }

  if (sector) {
    where.sector = { contains: sector, mode: "insensitive" };
  }

  // Count total
  const total = await db.job.count({ where });

  // Fetch jobs
  const jobs = await db.job.findMany({
    where,
    include: {
      agency: {
        select: {
          name: true,
          slug: true,
          logoUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    jobs,
    total,
    totalPages: Math.ceil(total / pageSize),
    currentPage: page,
  };
}

/**
 * Get agency details by slug for public hub
 */
export async function getPublicAgency(slug: string) {
  return db.agency.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      // Add other public fields if available
    },
  });
}
