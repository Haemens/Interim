/**
 * Shortlist Domain Queries
 */

import { db } from "@/lib/db";
import type { ShortlistSummary, ShortlistFilters, ShortlistDetailWithCandidates } from "./types";

/**
 * Get shortlists for an agency with optional filters
 */
export async function getShortlistsForAgency(
  agencyId: string,
  filters: ShortlistFilters = {}
): Promise<{ shortlists: ShortlistSummary[]; total: number }> {
  const { jobId, clientId, search, limit = 20, offset = 0 } = filters;

  const where = {
    agencyId,
    ...(jobId && { jobId }),
    ...(clientId && { clientId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { job: { title: { contains: search, mode: "insensitive" as const } } },
        { client: { name: { contains: search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [shortlists, total] = await Promise.all([
    db.shortlist.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        job: {
          select: { id: true, title: true },
        },
        client: {
          select: { id: true, name: true },
        },
        items: {
          select: { id: true },
        },
        feedback: {
          select: { decision: true },
        },
      },
    }),
    db.shortlist.count({ where }),
  ]);

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const summaries: ShortlistSummary[] = shortlists.map((sl) => {
    const approved = sl.feedback.filter((f) => f.decision === "APPROVED").length;
    const rejected = sl.feedback.filter((f) => f.decision === "REJECTED").length;
    const pending = sl.items.length - approved - rejected;

    return {
      id: sl.id,
      name: sl.name,
      shareToken: sl.shareToken,
      shareUrl: `${baseUrl}/shortlist/${sl.shareToken}`,
      note: sl.note,
      createdAt: sl.createdAt.toISOString(),
      updatedAt: sl.updatedAt.toISOString(),
      job: sl.job,
      client: sl.client,
      candidatesCount: sl.items.length,
      feedback: {
        approved,
        rejected,
        pending: Math.max(0, pending),
      },
    };
  });

  return { shortlists: summaries, total };
}

/**
 * Get shortlists for a specific job
 */
export async function getShortlistsForJob(
  agencyId: string,
  jobId: string
): Promise<ShortlistSummary[]> {
  const { shortlists } = await getShortlistsForAgency(agencyId, { jobId, limit: 100 });
  return shortlists;
}

/**
 * Get shortlist summary by ID
 */
export async function getShortlistSummary(
  agencyId: string,
  shortlistId: string
): Promise<ShortlistSummary | null> {
  const shortlist = await db.shortlist.findFirst({
    where: {
      id: shortlistId,
      agencyId,
    },
    include: {
      job: {
        select: { id: true, title: true },
      },
      client: {
        select: { id: true, name: true },
      },
      items: {
        select: { id: true },
      },
      feedback: {
        select: { decision: true },
      },
    },
  });

  if (!shortlist) return null;

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const approved = shortlist.feedback.filter((f) => f.decision === "APPROVED").length;
  const rejected = shortlist.feedback.filter((f) => f.decision === "REJECTED").length;
  const pending = shortlist.items.length - approved - rejected;

  return {
    id: shortlist.id,
    name: shortlist.name,
    shareToken: shortlist.shareToken,
    shareUrl: `${baseUrl}/shortlist/${shortlist.shareToken}`,
    note: shortlist.note,
    createdAt: shortlist.createdAt.toISOString(),
    updatedAt: shortlist.updatedAt.toISOString(),
    job: shortlist.job,
    client: shortlist.client,
    candidatesCount: shortlist.items.length,
    feedback: {
      approved,
      rejected,
      pending: Math.max(0, pending),
    },
  };
}

/**
 * Get detailed shortlist with full candidate information
 */
export async function getShortlistDetailWithCandidates(
  agencyId: string,
  shortlistId: string
): Promise<ShortlistDetailWithCandidates | null> {
  const shortlist = await db.shortlist.findFirst({
    where: {
      id: shortlistId,
      agencyId,
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          status: true,
          location: true,
        },
      },
      client: {
        select: {
          id: true,
          name: true,
          contactName: true,
          contactEmail: true,
        },
      },
      items: {
        orderBy: { order: "asc" },
        include: {
          application: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              status: true,
              cvUrl: true,
              tags: true,
              createdAt: true,
              candidateId: true,
            },
          },
        },
      },
      feedback: {
        select: {
          applicationId: true,
          decision: true,
          comment: true,
          createdAt: true,
        },
      },
    },
  });

  if (!shortlist) return null;

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // Create a map of application ID to feedback
  const feedbackMap = new Map(
    shortlist.feedback.map((f) => [f.applicationId, f])
  );

  // Build candidates array
  const candidates = shortlist.items.map((item) => {
    const feedback = feedbackMap.get(item.application.id);
    return {
      shortlistItemId: item.id,
      order: item.order,
      applicationId: item.application.id,
      candidateProfileId: item.application.candidateId,
      fullName: item.application.fullName,
      email: item.application.email,
      phone: item.application.phone,
      status: item.application.status,
      cvUrl: item.application.cvUrl,
      tags: item.application.tags,
      createdAt: item.application.createdAt.toISOString(),
      clientFeedback: feedback
        ? {
            decision: feedback.decision,
            comment: feedback.comment,
            createdAt: feedback.createdAt.toISOString(),
          }
        : null,
    };
  });

  // Calculate stats
  const approved = candidates.filter((c) => c.clientFeedback?.decision === "APPROVED").length;
  const rejected = candidates.filter((c) => c.clientFeedback?.decision === "REJECTED").length;
  const pending = candidates.length - approved - rejected;

  return {
    id: shortlist.id,
    name: shortlist.name,
    shareToken: shortlist.shareToken,
    shareUrl: `${baseUrl}/shortlist/${shortlist.shareToken}`,
    note: shortlist.note,
    createdAt: shortlist.createdAt.toISOString(),
    updatedAt: shortlist.updatedAt.toISOString(),
    job: shortlist.job,
    client: shortlist.client,
    candidates,
    stats: {
      total: candidates.length,
      approved,
      rejected,
      pending,
    },
  };
}
