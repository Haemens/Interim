import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantSlugFromRequest } from "@/lib/tenant";
import {
  getCurrentMembershipOrThrow,
  assertMinimumRole,
  UnauthorizedError,
  ForbiddenError,
  MembershipNotFoundError,
} from "@/modules/auth";
import { assertNotDemoAgency, DemoReadOnlyError, isDemoAgency } from "@/modules/auth/demo-mode";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { logInfo, logError } from "@/lib/log";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const contentStatusEnum = z.enum(["DRAFT", "APPROVED", "ARCHIVED"]);

const updateContentSchema = z.object({
  id: z.string().cuid(),
  title: z.string().max(200).optional().nullable(),
  body: z.string().max(10000).optional(),
  suggestedHashtags: z.string().max(1000).optional().nullable(),
  status: contentStatusEnum.optional(),
});

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Job Content API Error", {
    error: error instanceof Error ? error.message : "Unknown error",
  });

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.issues },
      { status: 400 }
    );
  }

  if (error instanceof DemoReadOnlyError) {
    return NextResponse.json(
      { error: error.message, code: "DEMO_READ_ONLY" },
      { status: 403 }
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof MembershipNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof TenantNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof TenantRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// =============================================================================
// GET /api/jobs/[jobId]/content - List content for a job
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can view content
    assertMinimumRole(membership, "RECRUITER");

    // Handle demo mode with demo content templates
    const isDemo = isDemoAgency(agency);
    if (isDemo && jobId.startsWith("demo-job-")) {
      // Return demo content templates
      const demoContents = [
        {
          id: "demo-content-1",
          variant: "LINKEDIN_POST",
          title: "Post LinkedIn - Offre Développeur",
          body: `🚀 Nous recrutons un Développeur Fullstack !

Rejoignez notre équipe dynamique et participez à des projets innovants.

✅ Stack moderne (React, Node.js, TypeScript)
✅ Télétravail flexible
✅ Équipe bienveillante
✅ Projets stimulants

📍 Paris (Remote possible)
💰 45-65K€

Intéressé(e) ? Postulez maintenant ! 👇`,
          suggestedHashtags: "#recrutement #developpeur #fullstack #react #nodejs #hiring #job #tech",
          status: "APPROVED",
          language: "fr",
          generatedAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          lastEditedAt: null,
          createdAt: new Date().toISOString(),
          createdBy: { id: "demo-user", name: "Demo User", email: "demo@example.com" },
          lastEditedBy: null,
          _count: { publications: 0 },
        },
        {
          id: "demo-content-2",
          variant: "INSTAGRAM_CAPTION",
          title: "Caption Instagram - Recrutement",
          body: `On recrute ! 🎯

Tu es développeur(se) passionné(e) ? 
Tu veux rejoindre une équipe au top ?

C'est le moment de postuler ! 💪

Lien en bio 👆`,
          suggestedHashtags: "#hiring #job #developer #tech #recrutement #emploi #carriere",
          status: "DRAFT",
          language: "fr",
          generatedAt: new Date().toISOString(),
          approvedAt: null,
          lastEditedAt: null,
          createdAt: new Date().toISOString(),
          createdBy: { id: "demo-user", name: "Demo User", email: "demo@example.com" },
          lastEditedBy: null,
          _count: { publications: 0 },
        },
        {
          id: "demo-content-3",
          variant: "TIKTOK_SCRIPT",
          title: "Script TikTok - Présentation offre",
          body: `[INTRO - 0-3s]
"Tu cherches un job de dev ?"

[HOOK - 3-8s]
"On recrute un développeur fullstack et voilà pourquoi tu devrais postuler..."

[CONTENU - 8-45s]
"Premièrement, stack moderne : React, Node, TypeScript.
Deuxièmement, télétravail flexible.
Troisièmement, une équipe vraiment cool.
Et quatrièmement, des projets qui ont du sens."

[CTA - 45-60s]
"Lien en bio pour postuler. On t'attend !"`,
          suggestedHashtags: "#job #tech #developer #hiring #carriere #recrutement",
          status: "DRAFT",
          language: "fr",
          generatedAt: new Date().toISOString(),
          approvedAt: null,
          lastEditedAt: null,
          createdAt: new Date().toISOString(),
          createdBy: { id: "demo-user", name: "Demo User", email: "demo@example.com" },
          lastEditedBy: null,
          _count: { publications: 0 },
        },
        {
          id: "demo-content-4",
          variant: "WHATSAPP_MESSAGE",
          title: "Message WhatsApp - Partage offre",
          body: `Salut ! 👋

Je partage cette offre qui pourrait t'intéresser :

🔹 *Développeur Fullstack*
🔹 Paris (Remote possible)
🔹 45-65K€

Stack : React, Node.js, TypeScript

Si ça t'intéresse, postule ici : [lien]

N'hésite pas à partager ! 🙏`,
          suggestedHashtags: null,
          status: "APPROVED",
          language: "fr",
          generatedAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          lastEditedAt: null,
          createdAt: new Date().toISOString(),
          createdBy: { id: "demo-user", name: "Demo User", email: "demo@example.com" },
          lastEditedBy: null,
          _count: { publications: 0 },
        },
      ];
      return NextResponse.json({ contents: demoContents, isDemo: true });
    }

    // Verify job exists and belongs to agency
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        agencyId: agency.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch content with edit audit info
    const contents = await db.jobPostContent.findMany({
      where: {
        jobId,
        agencyId: agency.id,
      },
      orderBy: [{ variant: "asc" }, { createdAt: "desc" }],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lastEditedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            publications: true,
          },
        },
      },
    });

    logInfo("Job content listed", {
      agencyId: agency.id,
      jobId,
      count: contents.length,
    });

    return NextResponse.json({ contents });
  } catch (error) {
    return handleError(error);
  }
}

// =============================================================================
// PATCH /api/jobs/[jobId]/content - Update content with approval workflow
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const tenantSlug = getTenantSlugFromRequest(request);

    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership, user } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can update content
    assertMinimumRole(membership, "RECRUITER");

    // Demo mode: block mutations
    assertNotDemoAgency(agency, "update content");

    // Verify job exists and belongs to agency
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        agencyId: agency.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Parse and validate body
    const body = await request.json();
    const data = updateContentSchema.parse(body);

    // Find content
    const existingContent = await db.jobPostContent.findFirst({
      where: {
        id: data.id,
        jobId,
        agencyId: agency.id,
      },
    });

    if (!existingContent) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Validate status transitions
    if (data.status !== undefined && data.status !== existingContent.status) {
      const currentStatus = existingContent.status;
      const newStatus = data.status;

      // Define allowed transitions
      // DRAFT -> APPROVED, ARCHIVED
      // APPROVED -> ARCHIVED, DRAFT (for re-editing)
      // ARCHIVED -> DRAFT (un-archive for re-use)
      const allowedTransitions: Record<string, string[]> = {
        DRAFT: ["APPROVED", "ARCHIVED"],
        APPROVED: ["ARCHIVED", "DRAFT"],
        ARCHIVED: ["DRAFT"],
      };

      if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${currentStatus} to ${newStatus}`,
            code: "INVALID_STATUS_TRANSITION",
          },
          { status: 400 }
        );
      }
    }

    // Build update data with edit audit trail
    const updateData: {
      title?: string | null;
      body?: string;
      suggestedHashtags?: string | null;
      status?: "DRAFT" | "APPROVED" | "ARCHIVED";
      approvedAt?: Date | null;
      lastEditedById: string;
      lastEditedAt: Date;
    } = {
      // Always track who edited and when
      lastEditedById: user.id,
      lastEditedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.suggestedHashtags !== undefined) updateData.suggestedHashtags = data.suggestedHashtags;
    if (data.status !== undefined) {
      updateData.status = data.status;
      // Set approvedAt when status changes to APPROVED
      if (data.status === "APPROVED" && existingContent.status !== "APPROVED") {
        updateData.approvedAt = new Date();
      }
      // Clear approvedAt if moving back to DRAFT
      if (data.status === "DRAFT" && existingContent.status === "APPROVED") {
        updateData.approvedAt = null;
      }
    }

    // Update content
    const content = await db.jobPostContent.update({
      where: { id: data.id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lastEditedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            publications: true,
          },
        },
      },
    });

    // Log event for status changes
    if (data.status !== undefined && data.status !== existingContent.status) {
      await db.eventLog.create({
        data: {
          agencyId: agency.id,
          userId: user.id,
          jobId,
          type: "CONTENT_STATUS_CHANGED",
          payload: {
            contentId: content.id,
            variant: content.variant,
            previousStatus: existingContent.status,
            newStatus: data.status,
          },
        },
      });
    }

    logInfo("Job content updated", {
      agencyId: agency.id,
      jobId,
      contentId: content.id,
      statusChange: data.status !== existingContent.status ? `${existingContent.status} -> ${data.status}` : null,
    });

    return NextResponse.json({ content });
  } catch (error) {
    return handleError(error);
  }
}
