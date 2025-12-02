/**
 * Rate Limiter with Redis support
 * 
 * Uses Redis (Upstash-compatible) in production for distributed rate limiting.
 * Falls back to in-memory storage in development or when Redis is not configured.
 * 
 * The API is consistent regardless of backend.
 */

import { logWarn, logError } from "@/lib/log";
import { getRedisClient, type RedisClient } from "@/lib/redis";

// =============================================================================
// TYPES
// =============================================================================

export interface RateLimitParams {
  /** Unique key for the rate limit (e.g., "apply-ip-1.2.3.4") */
  key: string;
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  ok: boolean;
  /** Number of requests remaining in the window */
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
  /** Seconds until the window resets (for Retry-After header) */
  retryAfterSeconds: number;
}

// =============================================================================
// IN-MEMORY STORE
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Global store - persists across requests in the same process
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  // Only cleanup once per interval
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  let cleaned = 0;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    // Don't log every cleanup, just track internally
  }
}

// =============================================================================
// REDIS-BACKED RATE LIMITER
// =============================================================================

/**
 * Rate limit using Redis (for production/distributed environments)
 */
async function rateLimitWithRedis(
  redis: RedisClient,
  params: RateLimitParams
): Promise<RateLimitResult> {
  const { key, limit, windowMs } = params;
  const redisKey = `rl:${key}`;
  const windowSeconds = Math.ceil(windowMs / 1000);
  const now = Date.now();

  try {
    // Increment the counter
    const count = await redis.incr(redisKey);

    // If this is the first request in the window, set expiration
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    // Get TTL to calculate reset time
    const ttl = await redis.ttl(redisKey);
    const resetAt = now + (ttl > 0 ? ttl * 1000 : windowMs);

    // Check if limit exceeded
    if (count > limit) {
      const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;
      return {
        ok: false,
        remaining: 0,
        resetAt,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }

    return {
      ok: true,
      remaining: Math.max(0, limit - count),
      resetAt,
      retryAfterSeconds: Math.ceil((resetAt - now) / 1000),
    };
  } catch (error) {
    // Log error but don't block the request - fall back to allowing it
    logError("Redis rate limit error, allowing request", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    // Return a permissive result on Redis failure
    return {
      ok: true,
      remaining: limit,
      resetAt: now + windowMs,
      retryAfterSeconds: 0,
    };
  }
}

// =============================================================================
// IN-MEMORY RATE LIMITER (FALLBACK)
// =============================================================================

/**
 * Rate limit using in-memory store (for development or when Redis unavailable)
 * 
 * Uses a fixed-window algorithm:
 * - Each key has a count and reset time
 * - When the window expires, the count resets
 * - If count >= limit within the window, request is denied
 */
function rateLimitInMemory(params: RateLimitParams): RateLimitResult {
  const { key, limit, windowMs } = params;
  const now = Date.now();

  // Cleanup expired entries occasionally
  cleanupExpiredEntries();

  // Get or create entry
  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new window
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    
    return {
      ok: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  // Increment count
  entry.count++;
  store.set(key, entry);

  return {
    ok: true,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
    retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
  };
}

// =============================================================================
// PUBLIC RATE LIMITER
// =============================================================================

/**
 * Check and update rate limit for a given key
 * 
 * Automatically uses Redis if configured, otherwise falls back to in-memory.
 */
export async function rateLimit(params: RateLimitParams): Promise<RateLimitResult> {
  const redis = getRedisClient();
  
  if (redis) {
    return rateLimitWithRedis(redis, params);
  }
  
  return rateLimitInMemory(params);
}

/**
 * Reset rate limit for a key (useful for testing or manual reset)
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    return {
      ok: true,
      remaining: limit,
      resetAt: now,
      retryAfterSeconds: 0,
    };
  }

  const remaining = Math.max(0, limit - entry.count);
  const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);

  return {
    ok: entry.count < limit,
    remaining,
    resetAt: entry.resetAt,
    retryAfterSeconds: remaining > 0 ? 0 : Math.max(1, retryAfterSeconds),
  };
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

/** Rate limit presets for common use cases */
export const RATE_LIMITS = {
  /** Public application submissions: 10 per 10 minutes */
  APPLICATION: { limit: 10, windowMs: 10 * 60 * 1000 },
  
  /** CV file uploads: 5 per 10 minutes */
  CV_UPLOAD: { limit: 5, windowMs: 10 * 60 * 1000 },
  
  /** Login attempts: 5 per 10 minutes */
  LOGIN: { limit: 5, windowMs: 10 * 60 * 1000 },
  
  /** Signup attempts: 3 per 10 minutes */
  SIGNUP: { limit: 3, windowMs: 10 * 60 * 1000 },
  
  /** General API calls: 100 per minute */
  API_GENERAL: { limit: 100, windowMs: 60 * 1000 },
} as const;

// =============================================================================
// HELPER FOR ROUTE HANDLERS
// =============================================================================

import { NextResponse } from "next/server";

/**
 * Apply rate limiting and return 429 response if exceeded
 * Returns null if request is allowed, or a NextResponse if blocked
 */
export async function applyRateLimit(
  key: string,
  config: { limit: number; windowMs: number }
): Promise<NextResponse | null> {
  const result = await rateLimit({
    key,
    limit: config.limit,
    windowMs: config.windowMs,
  });

  if (!result.ok) {
    logWarn("Rate limit exceeded", {
      key,
      retryAfter: result.retryAfterSeconds,
    });

    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(config.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt),
        },
      }
    );
  }

  return null;
}
