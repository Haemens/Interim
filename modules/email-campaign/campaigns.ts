import { db } from "@/lib/db";
import { EmailCampaignSendMode } from "./types";
import { resolveSegmentToCandidates } from "./segments";
import { logEvent } from "@/lib/log";

interface CreateCampaignInput {
  agencyId: string;
  createdById: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  jobId?: string;
  segmentId?: string;
  sendMode?: EmailCampaignSendMode;
  scheduledAt?: Date;
}

export async function createEmailCampaign(input: CreateCampaignInput) {
  const campaign = await db.emailCampaign.create({
    data: {
      agencyId: input.agencyId,
      createdById: input.createdById,
      name: input.name,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      bodyText: input.bodyText,
      jobId: input.jobId,
      segmentId: input.segmentId,
      sendMode: input.sendMode || "IMMEDIATE",
      scheduledAt: input.scheduledAt,
      status: "DRAFT",
    },
  });

  await logEvent({
    type: "EMAIL_CAMPAIGN_CREATED" as any, // Cast to any until log types are updated
    agencyId: input.agencyId,
    userId: input.createdById,
    payload: { campaignId: campaign.id, name: campaign.name },
  });

  return campaign;
}

export async function computeRecipientsForCampaign(
  agencyId: string,
  campaignId: string,
  segmentDefinition?: any // If provided, uses this ad-hoc definition instead of stored segment
) {
  // 1. Fetch campaign
  const campaign = await db.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { segment: true }
  });

  if (!campaign || campaign.agencyId !== agencyId) {
    throw new Error("Campaign not found");
  }

  // 2. Determine definition
  const def = segmentDefinition || campaign.segment?.definition;
  if (!def) {
    return 0;
  }

  // 3. Resolve candidates
  const candidates = await resolveSegmentToCandidates(agencyId, def as any);

  // 4. Create recipients
  const count = await db.$transaction(async (tx) => {
    // Delete existing PENDING recipients for this campaign to allow re-computation
    // Only delete PENDING so we don't lose history if we partially sent
    await tx.emailCampaignRecipient.deleteMany({
      where: { campaignId, status: "PENDING" }
    });

    // Filter out candidates who are opted out
    const validCandidates = candidates.filter(c => !c.isEmailOptedOut && c.email);

    if (validCandidates.length === 0) return 0;

    // Bulk create
    await tx.emailCampaignRecipient.createMany({
      data: validCandidates.map(c => ({
        campaignId,
        candidateId: c.id,
        email: c.email,
        status: "PENDING",
      })),
      skipDuplicates: true // Avoid uniqueness constraint errors if candidate already in campaign (non-PENDING)
    });

    // Update campaign total
    const total = await tx.emailCampaignRecipient.count({ where: { campaignId } });
    await tx.emailCampaign.update({
      where: { id: campaignId },
      data: { totalRecipientsPlanned: total }
    });

    return total;
  });

  return count;
}

export async function launchCampaign(agencyId: string, campaignId: string, userId: string) {
  const campaign = await db.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");

  const newStatus = campaign.sendMode === "SCHEDULED" && campaign.scheduledAt && campaign.scheduledAt > new Date() 
    ? "SCHEDULED" 
    : "SENDING";

  const updated = await db.emailCampaign.update({
    where: { id: campaignId },
    data: { status: newStatus }
  });

  await logEvent({
    type: "EMAIL_CAMPAIGN_LAUNCHED" as any,
    agencyId,
    userId,
    payload: { campaignId, status: newStatus }
  });

  return updated;
}
