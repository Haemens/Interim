import { describe, it, expect } from "vitest";
import {
  ApiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  rateLimited,
  validationFailed,
  planLimitReached,
  internalError,
  isApiError,
} from "@/lib/api-error";

describe("ApiError", () => {
  describe("ApiError class", () => {
    it("should create an error with correct properties", () => {
      const error = new ApiError("BAD_REQUEST", "Invalid input", 400, { field: "email" });

      expect(error.code).toBe("BAD_REQUEST");
      expect(error.message).toBe("Invalid input");
      expect(error.status).toBe(400);
      expect(error.details).toEqual({ field: "email" });
      expect(error.name).toBe("ApiError");
    });

    it("should serialize to JSON correctly", () => {
      const error = new ApiError("NOT_FOUND", "Resource not found", 404);
      const json = error.toJSON();

      expect(json).toEqual({
        error: "Resource not found",
        code: "NOT_FOUND",
      });
    });

    it("should include details in JSON when present", () => {
      const error = new ApiError("VALIDATION_FAILED", "Validation error", 422, [
        { field: "email", message: "Invalid email" },
      ]);
      const json = error.toJSON();

      expect(json).toEqual({
        error: "Validation error",
        code: "VALIDATION_FAILED",
        details: [{ field: "email", message: "Invalid email" }],
      });
    });
  });

  describe("Error factory helpers", () => {
    it("badRequest should create 400 error", () => {
      const error = badRequest("Invalid data");
      expect(error.status).toBe(400);
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.message).toBe("Invalid data");
    });

    it("unauthorized should create 401 error", () => {
      const error = unauthorized();
      expect(error.status).toBe(401);
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toBe("Authentication required");
    });

    it("forbidden should create 403 error", () => {
      const error = forbidden("Access denied");
      expect(error.status).toBe(403);
      expect(error.code).toBe("FORBIDDEN");
    });

    it("notFound should create 404 error", () => {
      const error = notFound("Job not found");
      expect(error.status).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
    });

    it("rateLimited should create 429 error with retry details", () => {
      const error = rateLimited("Too many requests", { retryAfter: 60 });
      expect(error.status).toBe(429);
      expect(error.code).toBe("RATE_LIMITED");
      expect(error.details).toEqual({ retryAfter: 60 });
    });

    it("validationFailed should create 422 error", () => {
      const issues = [{ path: ["email"], message: "Required" }];
      const error = validationFailed("Validation failed", issues);
      expect(error.status).toBe(422);
      expect(error.code).toBe("VALIDATION_FAILED");
      expect(error.details).toEqual(issues);
    });

    it("planLimitReached should create 403 error", () => {
      const error = planLimitReached("Job limit reached", { limit: 5, current: 5 });
      expect(error.status).toBe(403);
      expect(error.code).toBe("PLAN_LIMIT_REACHED");
    });

    it("internalError should create 500 error", () => {
      const error = internalError();
      expect(error.status).toBe(500);
      expect(error.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("isApiError type guard", () => {
    it("should return true for ApiError instances", () => {
      const error = new ApiError("BAD_REQUEST", "Test", 400);
      expect(isApiError(error)).toBe(true);
    });

    it("should return false for regular Error", () => {
      const error = new Error("Test");
      expect(isApiError(error)).toBe(false);
    });

    it("should return false for non-errors", () => {
      expect(isApiError("string")).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
      expect(isApiError({ code: "BAD_REQUEST" })).toBe(false);
    });
  });
});
