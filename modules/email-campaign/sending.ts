import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logEvent, logError } from "@/lib/log";
import { isDemoAgency } from "@/modules/auth/demo-mode";

export async function sendCampaignBatch(agencyId: string, campaignId: string, batchSize = 50) {
  // 1. Get campaign
  const campaign = await db.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { agency: true }
  });

  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status !== "SENDING") return 0;

  // 2. Fetch PENDING recipients
  const recipients = await db.emailCampaignRecipient.findMany({
    where: { campaignId, status: "PENDING" },
    take: batchSize,
    include: { candidate: true }
  });

  if (recipients.length === 0) {
    // Campaign done
    await db.emailCampaign.update({
      where: { id: campaignId },
      data: { status: "COMPLETED" }
    });
    return 0;
  }

  // 3. Process batch
  let sentCount = 0;
  const isDemo = isDemoAgency(campaign.agency);

  for (const recipient of recipients) {
    try {
      if (recipient.candidate.isEmailOptedOut) {
        await db.emailCampaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() }
        });
        continue;
      }

      if (!isDemo) {
        await sendEmail({
          to: recipient.email,
          subject: campaign.subject,
          html: campaign.bodyHtml,
          text: campaign.bodyText || undefined
        });
      } else {
        // Simulate delay
        await new Promise(r => setTimeout(r, 50)); 
      }

      await db.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SENT", sentAt: new Date() }
      });
      sentCount++;
    } catch (err) {
      await db.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { 
          status: "FAILED", 
          lastError: err instanceof Error ? err.message : "Unknown error" 
        }
      });
    }
  }

  // 4. Update campaign stats
  await db.emailCampaign.update({
    where: { id: campaignId },
    data: {
      sentCount: { increment: sentCount }
    }
  });

  return sentCount;
}
