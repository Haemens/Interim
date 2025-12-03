import { db } from "@/lib/db";
import { Mission, MissionStatus } from "@prisma/client";
import { logEvent } from "@/lib/log";

interface CreateMissionPayload {
  jobId: string;
  candidateId: string;
  clientId: string;
  agencyId: string;
  startDate: Date;
  endDatePlanned: Date;
  location?: string;
  hourlyRate?: number;
  billingRate?: number;
  createdById?: string;
}

export async function createMissionFromApplication(
  applicationId: string,
  payload: CreateMissionPayload
) {
  // Check if mission already exists
  const existing = await db.mission.findUnique({
    where: { applicationId }
  });

  if (existing) {
    return existing;
  }

  const mission = await db.mission.create({
    data: {
      applicationId,
      jobId: payload.jobId,
      candidateId: payload.candidateId,
      clientId: payload.clientId,
      agencyId: payload.agencyId,
      startDate: payload.startDate,
      endDatePlanned: payload.endDatePlanned,
      location: payload.location,
      hourlyRate: payload.hourlyRate,
      billingRate: payload.billingRate,
      status: "PLANNED",
      createdById: payload.createdById
    }
  });

  await logEvent({
    type: "MISSION_CREATED",
    agencyId: payload.agencyId,
    userId: payload.createdById,
    jobId: payload.jobId,
    payload: { missionId: mission.id, candidateId: payload.candidateId }
  });

  return mission;
}

export async function updateMissionStatus(
  missionId: string,
  newStatus: MissionStatus,
  userId: string,
  agencyId: string
) {
  const mission = await db.mission.findUnique({
    where: { id: missionId }
  });

  if (!mission) {
    throw new Error("Mission not found");
  }

  // Basic validation logic
  // e.g. preventing COMPLETED -> PLANNED without admin rights, but keeping it simple for now.

  const updated = await db.mission.update({
    where: { id: missionId },
    data: {
      status: newStatus,
      lastUpdatedById: userId,
      ...(newStatus === "COMPLETED" ? { endDateActual: new Date() } : {})
    }
  });

  await logEvent({
    type: "MISSION_STATUS_CHANGED",
    agencyId,
    userId,
    jobId: mission.jobId,
    payload: { 
      missionId, 
      oldStatus: mission.status, 
      newStatus 
    }
  });

  return updated;
}
