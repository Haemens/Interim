import { db } from "@/lib/db";
import { Prisma, MissionStatus } from "@prisma/client";
import { MissionFilters, MissionDetail, MissionSummary } from "./types";

export async function getMissionsForAgency(
  agencyId: string, 
  filters?: MissionFilters
): Promise<MissionSummary[]> {
  const where: Prisma.MissionWhereInput = {
    agencyId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.clientId ? { clientId: filters.clientId } : {}),
    ...(filters?.jobId ? { jobId: filters.jobId } : {}),
    ...(filters?.candidateId ? { candidateId: filters.candidateId } : {}),
    ...(filters?.from || filters?.to ? {
      startDate: {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to ? { lte: filters.to } : {})
      }
    } : {})
  };

  const missions = await db.mission.findMany({
    where,
    select: {
      id: true,
      status: true,
      startDate: true,
      endDatePlanned: true,
      location: true,
      createdAt: true,
      candidate: { select: { id: true, fullName: true } },
      job: { select: { id: true, title: true } },
      client: { select: { id: true, name: true } }
    },
    orderBy: { startDate: 'desc' }
  });

  return missions as MissionSummary[];
}

export async function getMissionDetail(agencyId: string, missionId: string): Promise<MissionDetail | null> {
  const mission = await db.mission.findUnique({
    where: { id: missionId },
    include: {
      candidate: true,
      job: true,
      client: true,
      application: true
    }
  });

  if (!mission || mission.agencyId !== agencyId) {
    return null;
  }

  return mission as MissionDetail;
}

export async function getMissionsForCandidate(agencyId: string, candidateId: string) {
  return db.mission.findMany({
    where: { agencyId, candidateId },
    orderBy: { startDate: 'desc' },
    include: {
      job: true,
      client: true
    }
  });
}

export async function getMissionsForJob(agencyId: string, jobId: string) {
  return db.mission.findMany({
    where: { agencyId, jobId },
    orderBy: { startDate: 'desc' },
    include: {
      candidate: true
    }
  });
}

export async function getMissionsForClient(agencyId: string, clientId: string) {
  return db.mission.findMany({
    where: { agencyId, clientId },
    orderBy: { startDate: 'desc' },
    include: {
      candidate: true,
      job: true
    }
  });
}
