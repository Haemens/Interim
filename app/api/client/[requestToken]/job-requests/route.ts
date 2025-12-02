import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logInfo } from "@/lib/log";
import { sendEmail } from "@/lib/email";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { isDemoAgencySlug } from "@/modules/auth/demo-mode";

// =============================================================================
// VALIDATION
// =============================================================================

const createJobRequestSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  location: z.string().max(200).optional(),
  contractType: z.string().max(100).optional(),
  salaryRange: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  requirements: z.string().max(5000).optional(),
  startDate: z.string().optional(), // ISO date string
  notes: z.string().max(2000).optional(),
});

// =============================================================================
// POST /api/client/[requestToken]/job-requests
// =============================================================================

export async function POST(
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

    // Find client by request token
    const client = await db.client.findUnique({
      where: { requestToken },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
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

    // Rate limit by IP + token
    const clientIp = getClientIp(request);
    const rateLimitKey = `job-request:${clientIp}:${requestToken}`;
    const rateLimitResponse = await applyRateLimit(rateLimitKey, RATE_LIMITS.API_GENERAL);

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate body
    const body = await request.json();
    const data = createJobRequestSchema.parse(body);

    // Check if this is a demo agency
    const isDemo = isDemoAgencySlug(client.agency.slug);

    // For demo agency, return success without actually creating
    if (isDemo) {
      return NextResponse.json({
        success: true,
        message: "Thank you! Your request has been received. (Demo mode - not actually stored)",
        jobRequest: {
          id: "demo-request-id",
          title: data.title,
          status: "NEW",
        },
      });
    }

    // Create job request
    const jobRequest = await db.jobRequest.create({
      data: {
        agencyId: client.agency.id,
        clientId: client.id,
        title: data.title,
        location: data.location || null,
        contractType: data.contractType || null,
        salaryRange: data.salaryRange || null,
        description: data.description || null,
        requirements: data.requirements || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        notes: data.notes || null,
        status: "NEW",
      },
    });

    // Log event
    logInfo("Client job request created", {
      jobRequestId: jobRequest.id,
      agencyId: client.agency.id,
      clientId: client.id,
      clientName: client.name,
      title: data.title,
    });

    // Send email notification to agency (async, don't block response)
    if (client.agency.email) {
      sendEmail({
        to: client.agency.email,
        subject: `New Job Request from ${client.name}`,
        text: `
You have received a new job request from ${client.name}${client.contactName ? ` (Contact: ${client.contactName})` : ""}.

Position: ${data.title}
${data.location ? `Location: ${data.location}` : ""}
${data.contractType ? `Contract Type: ${data.contractType}` : ""}
${data.salaryRange ? `Salary Range: ${data.salaryRange}` : ""}

${data.description ? `Description:\n${data.description}\n` : ""}
${data.requirements ? `Requirements:\n${data.requirements}\n` : ""}

Log in to QuestHire to review this request.
        `.trim(),
        html: `
<h2>New Job Request</h2>
<p>You have received a new job request from <strong>${client.name}</strong>${client.contactName ? ` (Contact: ${client.contactName})` : ""}.</p>

<table style="border-collapse: collapse; margin: 16px 0;">
  <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Position</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.title}</td></tr>
  ${data.location ? `<tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Location</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.location}</td></tr>` : ""}
  ${data.contractType ? `<tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Contract</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.contractType}</td></tr>` : ""}
  ${data.salaryRange ? `<tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Salary</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${data.salaryRange}</td></tr>` : ""}
</table>

${data.description ? `<h3>Description</h3><p>${data.description.replace(/\n/g, "<br>")}</p>` : ""}
${data.requirements ? `<h3>Requirements</h3><p>${data.requirements.replace(/\n/g, "<br>")}</p>` : ""}

<p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/job-requests">View in QuestHire</a></p>
        `.trim(),
      }).catch((err) => console.error("Failed to send job request notification:", err));
    }

    return NextResponse.json({
      success: true,
      message: "Your request has been sent to the agency.",
      jobRequest: {
        id: jobRequest.id,
        title: jobRequest.title,
        status: jobRequest.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating job request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
