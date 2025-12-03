/**
 * Client Domain Queries
 * 
 * Database queries for Client 360° view and client portal.
 */

import { db } from "@/lib/db";
import type {
  ClientSummary,
  ClientDetail,
  ClientJobRequest,
  ClientJob,
  ClientShortlist,
  ClientTimesheet,
  ClientKPIs,
  GetClientsParams,
  ClientsListResult,
  ClientPortalData,
} from "./types";

// =============================================================================
// GET CLIENTS FOR AGENCY (list view)
// =============================================================================

export async function getClientsForAgency(
  agencyId: string,
  params: GetClientsParams = {}
): Promise<ClientsListResult> {
  const { q, isActive, limit = 20, offset = 0 } = params;

  // Build where clause
  const where: {
    agencyId: string;
    isActive?: boolean;
    OR?: Array<{
      name?: { contains: string; mode: "insensitive" };
      contactEmail?: { contains: string; mode: "insensitive" };
      contactName?: { contains: string; mode: "insensitive" };
    }>;
  } = { agencyId };

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { contactEmail: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
    ];
  }

  // Fetch clients with counts
  const [clients, total] = await Promise.all([
    db.client.findMany({
      where,
      include: {
        jobs: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
        jobRequests: {
          where: { status: { in: ["NEW", "IN_REVIEW"] } },
          select: { id: true },
        },
        shortlists: {
          select: { id: true },
        },
        _count: {
          select: {
            jobs: true,
            jobRequests: true,
            shortlists: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.client.count({ where }),
  ]);

  // Transform to ClientSummary
  const clientSummaries: ClientSummary[] = clients.map((client) => {
    // Determine last activity from most recent job, request, or shortlist
    const lastActivityAt = client.updatedAt;

    return {
      id: client.id,
      name: client.name,
      contactName: client.contactName,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      sector: client.sector,
      isActive: client.isActive,
      openJobsCount: client.jobs.length,
      activeJobRequestsCount: client.jobRequests.length,
      shortlistsCount: client.shortlists.length,
      lastActivityAt,
      createdAt: client.createdAt,
    };
  });

  return {
    clients: clientSummaries,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + clients.length < total,
    },
  };
}

// =============================================================================
// GET CLIENT DETAIL (360° view)
// =============================================================================

export async function getClientDetail(
  agencyId: string,
  clientId: string
): Promise<ClientDetail | null> {
  const client = await db.client.findFirst({
    where: {
      id: clientId,
      agencyId,
    },
    include: {
      jobRequests: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          convertedJob: {
            select: { id: true },
          },
        },
      },
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          _count: {
            select: { applications: true },
          },
        },
      },
      shortlists: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          job: {
            select: { id: true, title: true },
          },
          items: {
            select: { id: true },
          },
          feedback: {
            select: { decision: true },
          },
        },
      },
      timesheets: {
        orderBy: { periodStart: "desc" },
        take: 50,
        include: {
          candidate: {
            select: { fullName: true },
          },
        },
      },
    },
  });

  if (!client) {
    return null;
  }

  // Transform job requests
  const jobRequests: ClientJobRequest[] = client.jobRequests.map((jr) => ({
    id: jr.id,
    title: jr.title,
    location: jr.location,
    contractType: jr.contractType,
    status: jr.status,
    createdAt: jr.createdAt,
    convertedJobId: jr.convertedJob?.id || null,
  }));

  // Transform jobs
  const jobs: ClientJob[] = client.jobs.map((job) => ({
    id: job.id,
    title: job.title,
    location: job.location,
    status: job.status,
    applicationsCount: job._count.applications,
    createdAt: job.createdAt,
  }));

  // Transform shortlists with feedback aggregation
  const shortlists: ClientShortlist[] = client.shortlists.map((sl) => {
    const approvalsCount = sl.feedback.filter((f) => f.decision === "APPROVED").length;
    const rejectionsCount = sl.feedback.filter((f) => f.decision === "REJECTED").length;
    const pendingCount = sl.items.length - approvalsCount - rejectionsCount;

    return {
      id: sl.id,
      name: sl.name,
      shareToken: sl.shareToken,
      jobTitle: sl.job.title,
      jobId: sl.job.id,
      candidatesCount: sl.items.length,
      approvalsCount,
      rejectionsCount,
      pendingCount: Math.max(0, pendingCount),
      createdAt: sl.createdAt,
    };
  });

  // Transform timesheets
  const timesheets: ClientTimesheet[] = client.timesheets.map((ts) => ({
    id: ts.id,
    candidateName: ts.candidate.fullName,
    periodStart: ts.periodStart,
    periodEnd: ts.periodEnd,
    totalHours: Number(ts.totalHours),
    status: ts.status,
    createdAt: ts.createdAt,
  }));

  // Calculate KPIs
  const activeJobs = client.jobs.filter((j) => j.status === "ACTIVE").length;
  const pendingJobRequests = client.jobRequests.filter(
    (jr) => jr.status === "NEW" || jr.status === "IN_REVIEW"
  ).length;

  // Get placements count (applications with PLACED status for client's jobs)
  const placementsCount = await db.application.count({
    where: {
      job: {
        clientId: client.id,
        agencyId,
      },
      status: "PLACED",
    },
  });

  const totalApprovals = shortlists.reduce((sum, sl) => sum + sl.approvalsCount, 0);
  const totalRejections = shortlists.reduce((sum, sl) => sum + sl.rejectionsCount, 0);
  const totalCandidatesReviewed = totalApprovals + totalRejections;

  const kpis: ClientKPIs = {
    totalJobs: client.jobs.length,
    activeJobs,
    totalJobRequests: client.jobRequests.length,
    pendingJobRequests,
    totalShortlists: client.shortlists.length,
    totalCandidatesReviewed,
    totalApprovals,
    totalRejections,
    totalPlacements: placementsCount,
  };

  return {
    id: client.id,
    name: client.name,
    contactName: client.contactName,
    contactEmail: client.contactEmail,
    contactPhone: client.contactPhone,
    sector: client.sector,
    notes: client.notes,
    isActive: client.isActive,
    requestToken: client.requestToken,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    jobRequests,
    jobs,
    shortlists,
    timesheets,
    kpis,
  };
}

// =============================================================================
// GET CLIENT PORTAL DATA (public, token-based)
// =============================================================================

export async function getClientPortalData(
  requestToken: string
): Promise<ClientPortalData | null> {
  const client = await db.client.findUnique({
    where: { requestToken },
    include: {
      agency: {
        select: {
          name: true,
          logoUrl: true,
          primaryColor: true,
        },
      },
      jobRequests: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          location: true,
          contractType: true,
          status: true,
          createdAt: true,
        },
      },
      shortlists: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          job: {
            select: { title: true },
          },
          items: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!client) {
    return null;
  }

  return {
    client: {
      id: client.id,
      name: client.name,
      contactName: client.contactName,
    },
    agency: {
      name: client.agency.name,
      logoUrl: client.agency.logoUrl,
      primaryColor: client.agency.primaryColor,
    },
    jobRequests: client.jobRequests.map((jr) => ({
      id: jr.id,
      title: jr.title,
      location: jr.location,
      contractType: jr.contractType,
      status: jr.status,
      createdAt: jr.createdAt.toISOString(),
    })),
    shortlists: client.shortlists.map((sl) => ({
      id: sl.id,
      name: sl.name,
      shareToken: sl.shareToken,
      jobTitle: sl.job.title,
      candidatesCount: sl.items.length,
      createdAt: sl.createdAt.toISOString(),
    })),
  };
}

// =============================================================================
// GET CLIENTS FOR SELECT DROPDOWN
// =============================================================================

export async function getClientsForSelect(agencyId: string) {
  return db.client.findMany({
    where: {
      agencyId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      contactName: true,
    },
    orderBy: { name: "asc" },
  });
}
