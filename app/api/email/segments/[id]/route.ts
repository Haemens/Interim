import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import { getCurrentMembershipOrThrow, getCurrentUser, assertMinimumRole } from "@/modules/auth";
import { logError } from "@/lib/log";
import { assertNotDemoAgency } from "@/modules/auth/demo-mode";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    }

    const { agency } = await getCurrentMembershipOrThrow(tenantSlug);
    
    const segment = await db.emailSegment.findUnique({
      where: { id }
    });

    if (!segment || segment.agencyId !== agency.id) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    return NextResponse.json({ segment });
  } catch (error) {
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

    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);
    assertMinimumRole(membership, "RECRUITER");
    assertNotDemoAgency(agency, "update segment");

    const body = await request.json();
    const segment = await db.emailSegment.findUnique({ where: { id } });
    
    if (!segment || segment.agencyId !== agency.id) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    const updated = await db.emailSegment.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        definition: body.definition
      }
    });

    return NextResponse.json({ segment: updated });
  } catch (error) {
    logError("Update Segment API Error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();
        const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
        
        if (!tenantSlug) {
            return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
        }
    
        const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);
        assertMinimumRole(membership, "RECRUITER");
        assertNotDemoAgency(agency, "delete segment");
    
        const segment = await db.emailSegment.findUnique({ where: { id } });
        if (!segment || segment.agencyId !== agency.id) return NextResponse.json({ error: "Segment not found" }, { status: 404 });

        await db.emailSegment.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        logError("Delete Segment API Error", { error: error instanceof Error ? error.message : "Unknown" });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
