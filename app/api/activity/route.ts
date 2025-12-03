import { NextRequest, NextResponse } from "next/server";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import { getCurrentMembershipOrThrow, getCurrentUser } from "@/modules/auth";
import { getActivityForTarget, getRecentActivityForAgency } from "@/modules/activity";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const { agency } = await getCurrentMembershipOrThrow(tenantSlug);
    
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");

    let activities;
    if (targetType && targetId) {
        // TODO: Validate targetType enum
        activities = await getActivityForTarget(agency.id, targetType as any, targetId);
    } else {
        activities = await getRecentActivityForAgency(agency.id);
    }

    return NextResponse.json({ activities });
  } catch (error) {
    logError("Activity API Error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
