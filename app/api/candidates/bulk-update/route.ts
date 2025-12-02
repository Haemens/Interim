import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import {
  getCurrentMembershipOrThrow,
  getCurrentUser,
  assertMinimumRole,
} from "@/modules/auth";
import { isDemoAgency } from "@/modules/auth/demo-mode";
import { logInfo } from "@/lib/log";

// =============================================================================
// VALIDATION
// =============================================================================

const bulkUpdateSchema = z.object({
  candidateIds: z.array(z.string()).min(1, "Au moins un candidat requis"),
  status: z.enum(["ACTIVE", "DO_NOT_CONTACT", "BLACKLISTED"]).optional(),
  addTags: z.array(z.string()).optional(),
  removeTags: z.array(z.string()).optional(),
});

// =============================================================================
// PATCH /api/candidates/bulk-update - Bulk update candidates
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const tenantSlug = await getTenantSlugWithFallback(request, user?.id ?? null);
    
    if (!tenantSlug) {
      return NextResponse.json(
        { error: "Tenant slug required" },
        { status: 400 }
      );
    }

    // Get membership context
    const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);

    // RBAC: RECRUITER and above can update candidates
    assertMinimumRole(membership, "RECRUITER");

    // Parse and validate body
    const body = await request.json();
    const data = bulkUpdateSchema.parse(body);

    // Demo mode: return simulated response
    if (isDemoAgency(agency)) {
      return NextResponse.json({
        updated: data.candidateIds.length,
        isDemo: true,
        message: "Mise à jour simulée en mode démo",
      });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.status) {
      updateData.status = data.status;
    }

    // Perform bulk update
    const result = await db.candidateProfile.updateMany({
      where: {
        id: { in: data.candidateIds },
        agencyId: agency.id,
      },
      data: updateData,
    });

    logInfo("Bulk candidate update", {
      agencyId: agency.id,
      count: result.count,
      status: data.status,
    });

    return NextResponse.json({
      updated: result.count,
      message: `${result.count} candidat(s) mis à jour`,
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}
