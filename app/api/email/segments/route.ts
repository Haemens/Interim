import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import { getCurrentMembershipOrThrow, getCurrentUser, assertMinimumRole } from "@/modules/auth";
import { logError } from "@/lib/log";
import { assertNotDemoAgency } from "@/modules/auth/demo-mode";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);
    assertMinimumRole(membership, "RECRUITER");

    const segments = await db.emailSegment.findMany({
      where: { agencyId: agency.id },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ segments });
  } catch (error) {
    logError("Segments API Error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const { agency, membership, user: dbUser } = await getCurrentMembershipOrThrow(tenantSlug);
    assertMinimumRole(membership, "RECRUITER");
    assertNotDemoAgency(agency, "create segment");

    const body = await request.json();
    if (!body.name || !body.definition) {
      return NextResponse.json({ error: "Missing name or definition" }, { status: 400 });
    }

    const segment = await db.emailSegment.create({
      data: {
        agencyId: agency.id,
        createdById: dbUser.id,
        name: body.name,
        description: body.description,
        definition: body.definition,
      }
    });

    return NextResponse.json({ segment }, { status: 201 });
  } catch (error) {
    logError("Create Segment API Error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
