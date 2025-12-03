import { db } from "@/lib/db";
import { EmailSegmentDefinition } from "./types";
import { Prisma, CandidateProfile } from "@prisma/client";

/**
 * Resolve a segment definition into a list of candidates
 */
export async function resolveSegmentToCandidates(
  agencyId: string,
  definition: EmailSegmentDefinition
): Promise<CandidateProfile[]> {
  const where: Prisma.CandidateProfileWhereInput = {
    agencyId,
    consentToContact: true,
    isEmailOptedOut: false,
    status: "ACTIVE", // By default, only active candidates
  };

  // Status filter override
  if (definition.status && definition.status.length > 0) {
    where.status = { in: definition.status };
  }

  // Location filter (partial match)
  if (definition.locations && definition.locations.length > 0) {
    where.OR = definition.locations.map(loc => ({
      location: { contains: loc, mode: "insensitive" }
    }));
  }

  // Skills/Tags filter (array contains)
  if (definition.tags && definition.tags.length > 0) {
    where.skills = { hasSome: definition.tags };
  }

  // Sectors filter
  if (definition.sectors && definition.sectors.length > 0) {
    where.sectors = { hasSome: definition.sectors };
  }

  // Application history filters
  // Prisma "some" matches if AT LEAST ONE application matches ALL conditions inside "some"
  // This is usually what we want: "Candidates who have at least one application that is (for Job X AND status Y)"
  const applicationConditions: any = {};

  if (definition.hasAppliedToJobIds && definition.hasAppliedToJobIds.length > 0) {
    applicationConditions.jobId = { in: definition.hasAppliedToJobIds };
  }

  if (definition.hasApplicationStatusIn && definition.hasApplicationStatusIn.length > 0) {
    applicationConditions.status = { in: definition.hasApplicationStatusIn };
  }

  if (definition.appliedWithinLastDays) {
    const date = new Date();
    date.setDate(date.getDate() - definition.appliedWithinLastDays);
    applicationConditions.createdAt = { gte: date };
  }

  if (Object.keys(applicationConditions).length > 0) {
    where.applications = { some: applicationConditions };
  }
  
  // Mission history
  if (definition.hasMissions) {
    where.missions = { some: {} };
  }

  return db.candidateProfile.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Build a quick segment definition for a job context
 */
export function buildQuickSegmentForJob(jobId: string, variant: string): EmailSegmentDefinition {
  switch (variant) {
    case "past_applicants":
      return {
        hasAppliedToJobIds: [jobId],
      };
    case "shortlisted":
        return {
            hasAppliedToJobIds: [jobId],
            hasApplicationStatusIn: ["QUALIFIED", "CONTACTED", "PLACED"]
        };
    default:
      return {};
  }
}
