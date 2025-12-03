import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import { getCurrentMembershipOrThrow, getCurrentUser, assertMinimumRole } from "@/modules/auth";
import { createEmailCampaign } from "@/modules/email-campaign/campaigns";
import { logError } from "@/lib/log";
import { logActivityEvent } from "@/modules/activity";
import { assertNotDemoAgency } from "@/modules/auth/demo-mode";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    if (!tenantSlug) return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });

    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);
    assertMinimumRole(membership, "RECRUITER");

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    const campaigns = await db.emailCampaign.findMany({
      where: {
        agencyId: agency.id,
        ...(jobId ? { jobId } : {})
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        totalRecipientsPlanned: true,
        sentCount: true,
        openCount: true,
        clickCount: true,
        createdAt: true,
        scheduledAt: true,
        job: { select: { id: true, title: true } }
      }
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    logError("Email Campaigns API Error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    if (!tenantSlug) return NextResponse.json({ error: "Tenant slug required" }, { status: 400 });

    const { agency, membership, user: dbUser } = await getCurrentMembershipOrThrow(tenantSlug);
    assertMinimumRole(membership, "RECRUITER");
    assertNotDemoAgency(agency, "create email campaign");

    const body = await request.json();
    if (!body.name || !body.subject || !body.bodyHtml) {
      return NextResponse.json({ error: "Missing required fields: name, subject, bodyHtml" }, { status: 400 });
    }

    const campaign = await createEmailCampaign({
      agencyId: agency.id,
      createdById: dbUser.id,
      name: body.name,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      bodyText: body.bodyText,
      jobId: body.jobId,
      segmentId: body.segmentId,
      sendMode: body.sendMode,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });

    // Log activity
    await logActivityEvent({
      agencyId: agency.id,
      actorUserId: dbUser.id,
      targetType: "EMAIL_CAMPAIGN",
      targetId: campaign.id,
      action: "CREATED",
      summary: `${dbUser.name || "User"} created campaign "${campaign.name}"`,
      metadata: { subject: campaign.subject }
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    logError("Create Campaign API Error", { error: error instanceof Error ? error.message : "Unknown" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
