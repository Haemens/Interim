/**
 * Standardized API error handling
 * 
 * Provides typed error codes and helper functions for consistent
 * error responses across all API routes.
 */

// =============================================================================
// ERROR CODES
// =============================================================================

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "PLAN_LIMIT_REACHED"
  | "VALIDATION_FAILED"
  | "TENANT_REQUIRED"
  | "STORAGE_ERROR";

// =============================================================================
// API ERROR CLASS
// =============================================================================

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

// =============================================================================
// ERROR FACTORY HELPERS
// =============================================================================

/**
 * 400 Bad Request
 */
export function badRequest(message = "Bad request", details?: unknown): ApiError {
  return new ApiError("BAD_REQUEST", message, 400, details);
}

/**
 * 401 Unauthorized
 */
export function unauthorized(message = "Authentication required"): ApiError {
  return new ApiError("UNAUTHORIZED", message, 401);
}

/**
 * 403 Forbidden
 */
export function forbidden(message = "Access denied"): ApiError {
  return new ApiError("FORBIDDEN", message, 403);
}

/**
 * 404 Not Found
 */
export function notFound(message = "Resource not found"): ApiError {
  return new ApiError("NOT_FOUND", message, 404);
}

/**
 * 409 Conflict
 */
export function conflict(message = "Resource conflict", details?: unknown): ApiError {
  return new ApiError("CONFLICT", message, 409, details);
}

/**
 * 429 Rate Limited
 */
export function rateLimited(
  message = "Too many requests",
  details?: { retryAfter?: number }
): ApiError {
  return new ApiError("RATE_LIMITED", message, 429, details);
}

/**
 * 422 Validation Failed
 */
export function validationFailed(
  message = "Validation failed",
  details?: unknown
): ApiError {
  return new ApiError("VALIDATION_FAILED", message, 422, details);
}

/**
 * 403 Plan Limit Reached
 */
export function planLimitReached(
  message = "Plan limit reached",
  details?: unknown
): ApiError {
  return new ApiError("PLAN_LIMIT_REACHED", message, 403, details);
}

/**
 * 400 Tenant Required
 */
export function tenantRequired(message = "Tenant slug required"): ApiError {
  return new ApiError("TENANT_REQUIRED", message, 400);
}

/**
 * 503 Storage Error
 */
export function storageError(message = "Storage service unavailable"): ApiError {
  return new ApiError("STORAGE_ERROR", message, 503);
}

/**
 * 500 Internal Error
 */
export function internalError(
  message = "Internal server error",
  details?: unknown
): ApiError {
  return new ApiError("INTERNAL_ERROR", message, 500, details);
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
