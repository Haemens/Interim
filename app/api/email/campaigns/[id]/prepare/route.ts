import { NextRequest, NextResponse } from "next/server";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import { getCurrentMembershipOrThrow, getCurrentUser, assertMinimumRole } from "@/modules/auth";
import { computeRecipientsForCampaign } from "@/modules/email-campaign/campaigns";
import { logError } from "@/lib/log";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);
    assertMinimumRole(membership, "RECRUITER");

    const body = await request.json().catch(() => ({}));
    
    const count = await computeRecipientsForCampaign(agency.id, params.id, body.segmentDefinition);
    return NextResponse.json({ count });
  } catch (error) {
    logError("Prepare Campaign API Error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
