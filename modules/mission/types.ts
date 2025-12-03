import { Mission, MissionStatus, CandidateProfile, Job, Client, Application } from "@prisma/client";

export type { Mission, MissionStatus };

export type MissionSummary = Pick<Mission, "id" | "status" | "startDate" | "endDatePlanned" | "location" | "createdAt"> & {
  candidate: Pick<CandidateProfile, "id" | "fullName">;
  job: Pick<Job, "id" | "title">;
  client: Pick<Client, "id" | "name">;
};

export type MissionDetail = Mission & {
  candidate: CandidateProfile;
  job: Job;
  client: Client;
  application: Application;
};

export interface MissionFilters {
  status?: MissionStatus;
  clientId?: string;
  jobId?: string;
  candidateId?: string;
  from?: Date;
  to?: Date;
}
