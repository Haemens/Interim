/**
 * Redis Client Wrapper (Upstash-compatible)
 * 
 * Provides a minimal Redis interface for rate limiting and caching.
 * Uses Upstash REST API for serverless compatibility.
 * 
 * Falls back gracefully when Redis is not configured.
 */

import { ENV } from "@/lib/env";
import { logInfo, logError, logWarn } from "@/lib/log";

// =============================================================================
// TYPES
// =============================================================================

export interface RedisClient {
  /** Increment a key and return the new value */
  incr: (key: string) => Promise<number>;
  /** Get TTL of a key in seconds (-1 if no TTL, -2 if key doesn't exist) */
  ttl: (key: string) => Promise<number>;
  /** Set expiration on a key */
  expire: (key: string, seconds: number) => Promise<void>;
  /** Get a key's value */
  get: (key: string) => Promise<string | null>;
  /** Set a key's value */
  set: (key: string, value: string, options?: { ex?: number }) => Promise<void>;
  /** Delete a key */
  del: (key: string) => Promise<void>;
  /** Ping the server */
  ping: () => Promise<boolean>;
}

// =============================================================================
// UPSTASH REST CLIENT
// =============================================================================

/**
 * Create an Upstash-compatible Redis client using REST API
 * This works in serverless environments without persistent connections
 */
function createUpstashClient(url: string, token?: string): RedisClient {
  // Parse URL to determine if it's Upstash format
  const isUpstashUrl = url.includes("upstash.io");
  
  // For Upstash, the URL format is: https://xxx.upstash.io
  // For standard Redis URL: redis://user:pass@host:port
  let baseUrl: string;
  let authToken: string | undefined = token;

  if (isUpstashUrl) {
    // Upstash REST API format
    baseUrl = url.startsWith("https://") ? url : `https://${url}`;
  } else {
    // Standard Redis URL - extract components
    // Format: redis://[:password@]host[:port][/db]
    const parsed = new URL(url);
    baseUrl = `https://${parsed.hostname}`;
    authToken = parsed.password || token;
  }

  async function executeCommand(command: string[]): Promise<unknown> {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Redis command failed: ${error}`);
    }

    const data = await response.json();
    
    // Upstash returns { result: value } format
    if (data && typeof data === "object" && "result" in data) {
      return data.result;
    }
    
    return data;
  }

  return {
    async incr(key: string): Promise<number> {
      const result = await executeCommand(["INCR", key]);
      return typeof result === "number" ? result : parseInt(String(result), 10);
    },

    async ttl(key: string): Promise<number> {
      const result = await executeCommand(["TTL", key]);
      return typeof result === "number" ? result : parseInt(String(result), 10);
    },

    async expire(key: string, seconds: number): Promise<void> {
      await executeCommand(["EXPIRE", key, String(seconds)]);
    },

    async get(key: string): Promise<string | null> {
      const result = await executeCommand(["GET", key]);
      return result === null ? null : String(result);
    },

    async set(key: string, value: string, options?: { ex?: number }): Promise<void> {
      const command = ["SET", key, value];
      if (options?.ex) {
        command.push("EX", String(options.ex));
      }
      await executeCommand(command);
    },

    async del(key: string): Promise<void> {
      await executeCommand(["DEL", key]);
    },

    async ping(): Promise<boolean> {
      try {
        const result = await executeCommand(["PING"]);
        return result === "PONG";
      } catch {
        return false;
      }
    },
  };
}

// =============================================================================
// CLIENT MANAGEMENT
// =============================================================================

let _redisClient: RedisClient | null = null;
let _clientInitialized = false;

/**
 * Get the Redis client instance
 * Returns null if Redis is not configured
 */
export function getRedisClient(): RedisClient | null {
  if (_clientInitialized) {
    return _redisClient;
  }

  _clientInitialized = true;

  const redisUrl = ENV.REDIS_URL;
  const redisToken = ENV.REDIS_TOKEN;

  if (!redisUrl) {
    if (ENV.IS_PRODUCTION) {
      logWarn("Redis not configured - using in-memory rate limiting (not recommended for production)");
    }
    return null;
  }

  try {
    _redisClient = createUpstashClient(redisUrl, redisToken);
    logInfo("Redis client initialized", { 
      provider: redisUrl.includes("upstash") ? "upstash" : "custom" 
    });
    return _redisClient;
  } catch (error) {
    logError("Failed to initialize Redis client", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Check if Redis is available and responding
 */
export async function isRedisHealthy(): Promise<{ healthy: boolean; latencyMs?: number }> {
  const client = getRedisClient();
  
  if (!client) {
    return { healthy: false };
  }

  const start = Date.now();
  
  try {
    const pong = await client.ping();
    const latencyMs = Date.now() - start;
    
    return {
      healthy: pong,
      latencyMs,
    };
  } catch (error) {
    logError("Redis health check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { healthy: false };
  }
}

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!ENV.REDIS_URL;
}
