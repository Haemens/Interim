import { NextRequest, NextResponse } from "next/server";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import { getCurrentMembershipOrThrow, getCurrentUser, assertMinimumRole } from "@/modules/auth";
import { launchCampaign } from "@/modules/email-campaign/campaigns";
import { assertNotDemoAgency } from "@/modules/auth/demo-mode";
import { logError } from "@/lib/log";
import { logActivityEvent } from "@/modules/activity";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const { agency, membership, user: dbUser } = await getCurrentMembershipOrThrow(tenantSlug);
    assertMinimumRole(membership, "RECRUITER");
    assertNotDemoAgency(agency, "launch email campaign");

    const updated = await launchCampaign(agency.id, params.id, dbUser.id);

    await logActivityEvent({
      agencyId: agency.id,
      actorUserId: dbUser.id,
      targetType: "EMAIL_CAMPAIGN",
      targetId: updated.id,
      action: "EMAIL_CAMPAIGN_LAUNCHED",
      summary: `${dbUser.name || "User"} launched campaign "${updated.name}"`,
      metadata: { status: updated.status }
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    logError("Launch Campaign API Error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
