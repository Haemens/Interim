import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantSlugWithFallback } from "@/lib/tenant";
import {
  getCurrentMembershipOrThrow,
  getCurrentUser,
  assertMinimumRole,
  UnauthorizedError,
  ForbiddenError,
  MembershipNotFoundError,
} from "@/modules/auth";
import { TenantNotFoundError, TenantRequiredError } from "@/lib/tenant";
import { logError } from "@/lib/log";

// =============================================================================
// ERROR HANDLER
// =============================================================================

function handleError(error: unknown): NextResponse {
  logError("Candidates API Error", {
    error: error instanceof Error ? error.message : "Unknown error",
  });

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
// GET /api/candidates - List candidate profiles for current agency
// =============================================================================

export async function GET(request: NextRequest) {
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

    // RBAC: RECRUITER and above can list candidates
    assertMinimumRole(membership, "RECRUITER");

    // Parse query params
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const status = searchParams.get("status");
    const sector = searchParams.get("sector");
    const tag = searchParams.get("tag");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      agencyId: agency.id,
    };

    // Status filter
    if (status && status !== "ALL") {
      where.status = status;
    }

    // Sector filter (partial match - check if any sector contains the search term)
    if (sector) {
      where.sectors = { hasSome: [sector] };
    }

    // Tag/skill filter (partial match - check if any skill contains the search term)
    if (tag) {
      where.skills = { hasSome: [tag] };
    }

    // Search filter
    if (q && q.trim()) {
      const searchTerm = q.trim();
      where.OR = [
        { fullName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { location: { contains: searchTerm, mode: "insensitive" } },
        { skills: { has: searchTerm } },
        { sectors: { has: searchTerm } },
      ];
    }

    // Fetch candidates with application count
    const [candidates, total] = await Promise.all([
      db.candidateProfile.findMany({
        where,
        orderBy: { lastAppliedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { applications: true },
          },
        },
      }),
      db.candidateProfile.count({ where }),
    ]);

    // Transform response
    const items = candidates.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      location: c.location,
      status: c.status,
      lastAppliedAt: c.lastAppliedAt.toISOString(),
      sectors: c.sectors,
      skills: c.skills,
      applicationsCount: c._count.applications,
    }));

    return NextResponse.json({
      items,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + items.length < total,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
