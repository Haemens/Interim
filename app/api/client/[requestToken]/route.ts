import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/client/[requestToken]
 * 
 * Public endpoint to get client portal data.
 * No authentication required - token-based access.
 * 
 * Returns:
 * - Client basic info
 * - Agency branding
 * - Recent job requests
 * - Recent shortlists shared with this client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestToken: string }> }
) {
  try {
    const { requestToken } = await params;

    if (!requestToken) {
      return NextResponse.json(
        { error: "Request token is required" },
        { status: 400 }
      );
    }

    // Find client by request token with related data
    const client = await db.client.findUnique({
      where: { requestToken },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
        jobRequests: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            title: true,
            location: true,
            contractType: true,
            status: true,
            createdAt: true,
          },
        },
        shortlists: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            job: {
              select: { title: true },
            },
            items: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Invalid request token" },
        { status: 404 }
      );
    }

    // Return full portal data
    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        contactName: client.contactName,
      },
      agency: {
        name: client.agency.name,
        logoUrl: client.agency.logoUrl,
        primaryColor: client.agency.primaryColor,
      },
      jobRequests: client.jobRequests.map((jr) => ({
        id: jr.id,
        title: jr.title,
        location: jr.location,
        contractType: jr.contractType,
        status: jr.status,
        createdAt: jr.createdAt.toISOString(),
      })),
      shortlists: client.shortlists.map((sl) => ({
        id: sl.id,
        name: sl.name,
        shareToken: sl.shareToken,
        jobTitle: sl.job.title,
        candidatesCount: sl.items.length,
        createdAt: sl.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching client info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
