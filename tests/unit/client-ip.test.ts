import { describe, it, expect } from "vitest";
import { getClientIp, hashIp } from "@/lib/client-ip";
import { NextRequest } from "next/server";

describe("Client IP Utilities", () => {
  describe("getClientIp", () => {
    it("should extract IP from CF-Connecting-IP header", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "cf-connecting-ip": "1.2.3.4",
        },
      });

      expect(getClientIp(request)).toBe("1.2.3.4");
    });

    it("should extract IP from X-Real-IP header", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-real-ip": "5.6.7.8",
        },
      });

      expect(getClientIp(request)).toBe("5.6.7.8");
    });

    it("should extract first IP from X-Forwarded-For header", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "9.10.11.12, 13.14.15.16, 17.18.19.20",
        },
      });

      expect(getClientIp(request)).toBe("9.10.11.12");
    });

    it("should prefer CF-Connecting-IP over other headers", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "cf-connecting-ip": "1.1.1.1",
          "x-real-ip": "2.2.2.2",
          "x-forwarded-for": "3.3.3.3",
        },
      });

      expect(getClientIp(request)).toBe("1.1.1.1");
    });

    it("should return 'unknown' when no IP headers present", () => {
      const request = new NextRequest("http://localhost/api/test");

      expect(getClientIp(request)).toBe("unknown");
    });

    it("should handle Vercel forwarded-for header", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-vercel-forwarded-for": "100.200.100.200",
        },
      });

      expect(getClientIp(request)).toBe("100.200.100.200");
    });
  });

  describe("hashIp", () => {
    it("should return a hash string", () => {
      const hash = hashIp("192.168.1.1");

      expect(typeof hash).toBe("string");
      expect(hash.length).toBeLessThanOrEqual(8);
    });

    it("should return consistent hash for same IP", () => {
      const hash1 = hashIp("10.0.0.1");
      const hash2 = hashIp("10.0.0.1");

      expect(hash1).toBe(hash2);
    });

    it("should return different hashes for different IPs", () => {
      const hash1 = hashIp("10.0.0.1");
      const hash2 = hashIp("10.0.0.2");

      expect(hash1).not.toBe(hash2);
    });
  });
});
