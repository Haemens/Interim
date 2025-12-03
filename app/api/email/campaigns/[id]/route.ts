import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import { getCurrentMembershipOrThrow, getCurrentUser, assertMinimumRole } from "@/modules/auth";
import { assertNotDemoAgency } from "@/modules/auth/demo-mode";
import { logError } from "@/lib/log";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    if (!tenantSlug) return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });

    const { agency } = await getCurrentMembershipOrThrow(tenantSlug);
    
    const campaign = await db.emailCampaign.findUnique({
      where: { id },
      include: {
        segment: true,
        job: { select: { id: true, title: true } },
        recipients: {
          take: 5,
          orderBy: { email: 'asc' }
        }
      }
    });

    if (!campaign || campaign.agencyId !== agency.id) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    logError("Get Campaign API Error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    if (!tenantSlug) return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });

    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);
    assertMinimumRole(membership, "RECRUITER");
    assertNotDemoAgency(agency, "update email campaign");

    const body = await request.json();
    const campaign = await db.emailCampaign.findUnique({ where: { id } });
    
    if (!campaign || campaign.agencyId !== agency.id) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
        if (body.status === "PAUSED" || body.status === "CANCELLED") {
            // Allow status change for control
        } else {
            return NextResponse.json({ error: "Cannot edit active/completed campaign details" }, { status: 400 });
        }
    }

    const updated = await db.emailCampaign.update({
      where: { id },
      data: {
        name: body.name,
        subject: body.subject,
        bodyHtml: body.bodyHtml,
        bodyText: body.bodyText,
        segmentId: body.segmentId,
        sendMode: body.sendMode,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        status: body.status
      }
    });

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    logError("Update Campaign API Error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();
        const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
        if (!tenantSlug) return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });
    
        const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);
        assertMinimumRole(membership, "RECRUITER");
        assertNotDemoAgency(agency, "delete email campaign");
    
        const campaign = await db.emailCampaign.findUnique({ where: { id } });
        if (!campaign || campaign.agencyId !== agency.id) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

        if (campaign.status === "SENDING" || campaign.status === "COMPLETED") {
             return NextResponse.json({ error: "Cannot delete active/completed campaign" }, { status: 400 });
        }

        await db.emailCampaign.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        logError("Delete Campaign API Error", { error: error instanceof Error ? error.message : "Unknown" });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
