import { NextRequest, NextResponse } from "next/server";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import { getCurrentMembershipOrThrow, getCurrentUser, assertMinimumRole } from "@/modules/auth";
import { getMissionDetail } from "@/modules/mission/queries";
import { updateMissionStatus } from "@/modules/mission/lifecycle";
import { logError } from "@/lib/log";
import { z } from "zod";
import { isDemoAgency } from "@/modules/auth/demo-mode";

const updateSchema = z.object({
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED", "NO_SHOW", "SUSPENDED"]),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const { agency } = await getCurrentMembershipOrThrow(tenantSlug);
    
    const mission = await getMissionDetail(agency.id, id);
    if (!mission) {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }

    return NextResponse.json({ mission });
  } catch (error) {
    logError("Get Mission Error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const { agency, membership, user: dbUser } = await getCurrentMembershipOrThrow(tenantSlug);
    assertMinimumRole(membership, "RECRUITER");

    // Demo mode check
    if (isDemoAgency(agency)) {
      return NextResponse.json({ 
        message: "Simulation: Mission updated (Demo Mode)",
        mission: { id, ...await request.json() } 
      });
    }

    const body = await request.json();
    const { status } = updateSchema.parse(body);

    const updated = await updateMissionStatus(id, status as any, dbUser.id, agency.id);
    return NextResponse.json({ mission: updated });
  } catch (error) {
    logError("Update Mission Error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
