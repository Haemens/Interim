import { NextRequest, NextResponse } from "next/server";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import { getCurrentMembershipOrThrow, getCurrentUser, assertMinimumRole } from "@/modules/auth";
import { getMissionsForAgency } from "@/modules/mission/queries";
import { MissionFilters, MissionStatus } from "@/modules/mission/types";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);
    assertMinimumRole(membership, "RECRUITER");

    const { searchParams } = new URL(request.url);
    
    const filters: MissionFilters = {
      status: (searchParams.get("status") as MissionStatus) || undefined,
      clientId: searchParams.get("clientId") || undefined,
      jobId: searchParams.get("jobId") || undefined,
      candidateId: searchParams.get("candidateId") || undefined,
      from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
      to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
    };

    const missions = await getMissionsForAgency(agency.id, filters);
    return NextResponse.json({ missions });
  } catch (error) {
    logError("Missions API Error", { error: error instanceof Error ? error.message : "Unknown" });
    // Basic error handling - could be improved with handleError helper
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
