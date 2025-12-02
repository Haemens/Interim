import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the log module to avoid db dependency
vi.mock("@/lib/log", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import {
  rateLimit,
  resetRateLimit,
  getRateLimitStatus,
  RATE_LIMITS,
} from "@/lib/rate-limit";

describe("Rate Limiter", () => {
  beforeEach(() => {
    // Reset all rate limits before each test
    resetRateLimit("test-key");
    resetRateLimit("test-key-2");
  });

  describe("rateLimit", () => {
    it("should allow requests under the limit", async () => {
      const result = await rateLimit({
        key: "test-key",
        limit: 5,
        windowMs: 60000,
      });

      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should track request count correctly", async () => {
      const config = { key: "test-key", limit: 3, windowMs: 60000 };

      const r1 = await rateLimit(config);
      const r2 = await rateLimit(config);
      const r3 = await rateLimit(config);

      expect(r1.remaining).toBe(2);
      expect(r2.remaining).toBe(1);
      expect(r3.remaining).toBe(0);
    });

    it("should block requests at the limit", async () => {
      const config = { key: "test-key", limit: 2, windowMs: 60000 };

      await rateLimit(config);
      await rateLimit(config);
      const result = await rateLimit(config);

      expect(result.ok).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should provide retry-after information", async () => {
      const config = { key: "test-key", limit: 1, windowMs: 60000 };

      await rateLimit(config);
      const result = await rateLimit(config);

      expect(result.ok).toBe(false);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it("should use separate counters for different keys", async () => {
      const config1 = { key: "test-key", limit: 1, windowMs: 60000 };
      const config2 = { key: "test-key-2", limit: 1, windowMs: 60000 };

      await rateLimit(config1);
      const result1 = await rateLimit(config1);
      const result2 = await rateLimit(config2);

      expect(result1.ok).toBe(false);
      expect(result2.ok).toBe(true);
    });

    it("should reset after window expires", async () => {
      vi.useFakeTimers();

      const config = { key: "test-key", limit: 1, windowMs: 1000 };

      await rateLimit(config);
      const blocked = await rateLimit(config);
      expect(blocked.ok).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(1100);

      const allowed = await rateLimit(config);
      expect(allowed.ok).toBe(true);

      vi.useRealTimers();
    });
  });

  describe("getRateLimitStatus", () => {
    it("should return status without incrementing", async () => {
      const config = { key: "test-key", limit: 5, windowMs: 60000 };

      await rateLimit(config);
      await rateLimit(config);

      const status = getRateLimitStatus("test-key", 5);
      expect(status.remaining).toBe(3);

      // Verify it didn't increment
      const status2 = getRateLimitStatus("test-key", 5);
      expect(status2.remaining).toBe(3);
    });

    it("should return full limit for unknown keys", () => {
      const status = getRateLimitStatus("unknown-key", 10);
      expect(status.ok).toBe(true);
      expect(status.remaining).toBe(10);
    });
  });

  describe("resetRateLimit", () => {
    it("should reset the counter for a key", async () => {
      const config = { key: "test-key", limit: 1, windowMs: 60000 };

      await rateLimit(config);
      const blocked = await rateLimit(config);
      expect(blocked.ok).toBe(false);

      resetRateLimit("test-key");

      const allowed = await rateLimit(config);
      expect(allowed.ok).toBe(true);
    });
  });

  describe("RATE_LIMITS presets", () => {
    it("should have APPLICATION preset", () => {
      expect(RATE_LIMITS.APPLICATION).toEqual({
        limit: 10,
        windowMs: 600000,
      });
    });

    it("should have CV_UPLOAD preset", () => {
      expect(RATE_LIMITS.CV_UPLOAD).toEqual({
        limit: 5,
        windowMs: 600000,
      });
    });

    it("should have LOGIN preset", () => {
      expect(RATE_LIMITS.LOGIN).toEqual({
        limit: 5,
        windowMs: 600000,
      });
    });

    it("should have SIGNUP preset", () => {
      expect(RATE_LIMITS.SIGNUP).toEqual({
        limit: 3,
        windowMs: 600000,
      });
    });
  });
});
