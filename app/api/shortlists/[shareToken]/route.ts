import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// =============================================================================
// GET /api/shortlists/[shareToken] - Public shortlist view (no auth required)
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params;

    if (!shareToken) {
      return NextResponse.json(
        { error: "Share token required" },
        { status: 400 }
      );
    }

    // Find shortlist by share token
    const shortlist = await db.shortlist.findUnique({
      where: { shareToken },
      include: {
        agency: {
          select: {
            name: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            contractType: true,
          },
        },
        items: {
          include: {
            application: {
              select: {
                id: true,
                fullName: true,
                status: true,
                tags: true,
                // Note: We intentionally exclude email, phone, cvUrl for privacy
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!shortlist) {
      return NextResponse.json(
        { error: "Shortlist not found" },
        { status: 404 }
      );
    }

    // Transform to public-safe format
    const publicShortlist = {
      id: shortlist.id,
      name: shortlist.name,
      note: shortlist.note,
      createdAt: shortlist.createdAt,
      agency: shortlist.agency,
      job: shortlist.job,
      candidates: shortlist.items.map((item) => ({
        id: item.application.id,
        name: item.application.fullName,
        status: item.application.status,
        tags: item.application.tags,
        order: item.order,
      })),
    };

    return NextResponse.json({ shortlist: publicShortlist });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
