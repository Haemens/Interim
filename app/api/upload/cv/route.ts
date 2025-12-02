import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantSlugFromRequest } from "@/lib/tenant";
import { getClientIp } from "@/lib/client-ip";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  uploadCvFile,
  isStorageConfigured,
  FileTooLargeError,
  InvalidContentTypeError,
  StorageNotConfiguredError,
  getAllowedCvContentTypes,
  getMaxFileSize,
} from "@/lib/storage";
import { logInfo, logError, logWarn } from "@/lib/log";

// =============================================================================
// POST /api/upload/cv - Upload CV file
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResponse = await applyRateLimit(
      `upload-cv-${clientIp}`,
      RATE_LIMITS.CV_UPLOAD
    );
    if (rateLimitResponse) return rateLimitResponse;

    // Check if storage is configured
    if (!isStorageConfigured()) {
      logWarn("CV upload attempted but storage not configured");
      return NextResponse.json(
        { error: "File upload is not available. Please provide a CV URL instead." },
        { status: 503 }
      );
    }

    // Get tenant context
    const tenantSlug = getTenantSlugFromRequest(request);
    let agencyId: string | null = null;

    // Try to get agency from tenant slug
    if (tenantSlug) {
      const agency = await db.agency.findUnique({
        where: { slug: tenantSlug },
        select: { id: true },
      });
      agencyId = agency?.id || null;
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const jobId = formData.get("jobId") as string | null;
    const email = formData.get("email") as string | null;

    // If no agency from tenant, try to get from job
    if (!agencyId && jobId) {
      const job = await db.job.findUnique({
        where: { id: jobId },
        select: { agencyId: true },
      });
      agencyId = job?.agencyId || null;
    }

    // Validate agency
    if (!agencyId) {
      return NextResponse.json(
        { error: "Could not determine agency context. Please provide a valid jobId." },
        { status: 400 }
      );
    }

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file size before reading
    if (file.size > getMaxFileSize()) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${getMaxFileSize() / 1024 / 1024} MB.` },
        { status: 400 }
      );
    }

    // Check content type
    const allowedTypes = getAllowedCvContentTypes();
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed types: PDF, DOC, DOCX, RTF, TXT` },
        { status: 400 }
      );
    }

    logInfo("Processing CV upload", {
      agencyId,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      jobId,
    });

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to storage
    const result = await uploadCvFile({
      agencyId,
      candidateEmail: email || undefined,
      fileName: file.name,
      contentType: file.type,
      buffer,
    });

    logInfo("CV uploaded successfully", {
      agencyId,
      key: result.key,
      url: result.url,
    });

    return NextResponse.json({
      url: result.url,
      key: result.key,
    });
  } catch (error) {
    if (error instanceof FileTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof InvalidContentTypeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json(
        { error: "File upload is not available" },
        { status: 503 }
      );
    }

    logError("CV upload error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/upload/cv - Get upload configuration
// =============================================================================

export async function GET() {
  return NextResponse.json({
    configured: isStorageConfigured(),
    maxSizeBytes: getMaxFileSize(),
    maxSizeMB: getMaxFileSize() / 1024 / 1024,
    allowedTypes: getAllowedCvContentTypes(),
    allowedExtensions: [".pdf", ".doc", ".docx", ".rtf", ".txt"],
  });
}
