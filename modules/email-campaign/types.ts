import { EmailCampaign, EmailSegment, EmailRecipientStatus, EmailCampaignStatus, EmailCampaignSendMode, CandidateStatus, ApplicationStatus } from "@prisma/client";

export type { EmailCampaign, EmailSegment, EmailRecipientStatus, EmailCampaignStatus, EmailCampaignSendMode };

export interface EmailSegmentDefinition {
  // Candidate fields
  locations?: string[];
  tags?: string[]; // skills field in CandidateProfile
  sectors?: string[];
  status?: CandidateStatus[];
  
  // Application history
  hasAppliedToJobIds?: string[];
  hasApplicationStatusIn?: ApplicationStatus[];
  appliedWithinLastDays?: number;
  
  // Mission history
  hasMissions?: boolean;
}

export type EmailCampaignSummary = Pick<
  EmailCampaign,
  "id" | "name" | "status" | "totalRecipientsPlanned" | "sentCount" | "openCount" | "clickCount" | "createdAt" | "scheduledAt"
> & {
  job?: { id: string; title: string } | null;
};

export type EmailCampaignDetail = EmailCampaign & {
  segment: EmailSegment | null;
  job: { id: string; title: string } | null;
};
