import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getRedisClient, isRedisConfigured } from "@/lib/redis";
import { logError } from "@/lib/log";

/**
 * GET /api/health/deep
 * 
 * Deep healthcheck endpoint that verifies external dependencies:
 * - Database connectivity
 * - Redis connectivity (if configured)
 * 
 * Returns status: "ok" | "degraded" | "error"
 * - ok: All checks passed
 * - degraded: Some non-critical checks failed (e.g., Redis)
 * - error: Critical checks failed (e.g., Database)
 */
export async function GET() {
  const checks: {
    db: { status: "ok" | "error"; latencyMs?: number; error?: string };
    redis: { status: "ok" | "skipped" | "error"; latencyMs?: number; error?: string };
  } = {
    db: { status: "error" },
    redis: { status: "skipped" },
  };

  let overallStatus: "ok" | "degraded" | "error" = "ok";

  // ==========================================================================
  // Database Check
  // ==========================================================================
  try {
    const dbStart = Date.now();
    
    // Simple query to verify database connectivity
    await db.$queryRaw`SELECT 1`;
    
    checks.db = {
      status: "ok",
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logError("Health check: Database connection failed", { error: errorMessage });
    
    checks.db = {
      status: "error",
      error: errorMessage,
    };
    overallStatus = "error";
  }

  // ==========================================================================
  // Redis Check (if configured)
  // ==========================================================================
  if (isRedisConfigured()) {
    try {
      const redisStart = Date.now();
      const redis = getRedisClient();
      
      if (redis) {
        // Test with a simple INCR/EXPIRE on a health check key
        const testKey = "health:check";
        await redis.incr(testKey);
        await redis.expire(testKey, 60);
        
        checks.redis = {
          status: "ok",
          latencyMs: Date.now() - redisStart,
        };
      } else {
        checks.redis = {
          status: "error",
          error: "Redis client not initialized",
        };
        // Redis failure is degraded, not error (non-critical)
        if (overallStatus === "ok") {
          overallStatus = "degraded";
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logError("Health check: Redis connection failed", { error: errorMessage });
      
      checks.redis = {
        status: "error",
        error: errorMessage,
      };
      // Redis failure is degraded, not error (non-critical)
      if (overallStatus === "ok") {
        overallStatus = "degraded";
      }
    }
  }

  // ==========================================================================
  // Response
  // ==========================================================================
  const response = {
    status: overallStatus,
    checks,
    timestamp: new Date().toISOString(),
  };

  // Return appropriate status code
  const statusCode = overallStatus === "error" ? 503 : 200;

  return NextResponse.json(response, { status: statusCode });
}

// Ensure this endpoint is not cached
export const dynamic = "force-dynamic";
