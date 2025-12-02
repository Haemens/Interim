import { NextResponse } from "next/server";

/**
 * GET /api/health
 * 
 * Basic healthcheck endpoint for uptime monitoring.
 * Returns quickly without checking external dependencies.
 * 
 * Use /api/health/deep for a comprehensive check including DB and Redis.
 */
export async function GET() {
  // Version can be set via environment variable or read from package.json at build time
  const version = process.env.npm_package_version || process.env.APP_VERSION || "1.0.0";

  return NextResponse.json({
    status: "ok",
    version,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
}

// Ensure this endpoint is not cached
export const dynamic = "force-dynamic";
