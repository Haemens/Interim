/**
 * API Route Handler Wrapper
 * 
 * Provides consistent error handling, logging, and monitoring
 * for all API routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, isApiError, internalError, validationFailed } from "./api-error";
import { logError } from "./log";
import { captureException } from "./monitoring";
import {
  UnauthorizedError,
  ForbiddenError,
  MembershipNotFoundError,
} from "@/modules/auth";
import { TenantNotFoundError, TenantRequiredError } from "./tenant";

// =============================================================================
// TYPES
// =============================================================================

type ApiHandler = (req: NextRequest) => Promise<NextResponse>;

type ApiHandlerWithParams<T> = (
  req: NextRequest,
  context: { params: Promise<T> }
) => Promise<NextResponse>;

interface HandlerOptions {
  /** Route name for logging context */
  route?: string;
}

// =============================================================================
// ERROR RESPONSE BUILDER
// =============================================================================

function buildErrorResponse(error: ApiError): NextResponse {
  const headers: Record<string, string> = {};

  // Add rate limit headers if applicable
  if (error.code === "RATE_LIMITED" && error.details) {
    const details = error.details as { retryAfter?: number };
    if (details.retryAfter) {
      headers["Retry-After"] = String(details.retryAfter);
    }
  }

  return NextResponse.json(error.toJSON(), {
    status: error.status,
    headers,
  });
}

// =============================================================================
// ERROR MAPPER
// =============================================================================

/**
 * Convert known error types to ApiError
 */
function mapToApiError(error: unknown): ApiError {
  // Already an ApiError
  if (isApiError(error)) {
    return error;
  }

  // Zod validation error
  if (error instanceof z.ZodError) {
    return validationFailed("Validation failed", error.issues);
  }

  // Auth module errors
  if (error instanceof UnauthorizedError) {
    return new ApiError("UNAUTHORIZED", error.message, 401);
  }
  if (error instanceof ForbiddenError) {
    return new ApiError("FORBIDDEN", error.message, 403);
  }
  if (error instanceof MembershipNotFoundError) {
    return new ApiError("FORBIDDEN", "Not a member of this agency", 403);
  }

  // Tenant errors
  if (error instanceof TenantNotFoundError) {
    return new ApiError("NOT_FOUND", "Agency not found", 404);
  }
  if (error instanceof TenantRequiredError) {
    return new ApiError("TENANT_REQUIRED", "Tenant slug required", 400);
  }

  // Unknown error - return generic 500
  return internalError();
}

// =============================================================================
// HANDLER WRAPPER
// =============================================================================

/**
 * Wrap an API handler with consistent error handling
 * 
 * @example
 * ```ts
 * export const GET = createApiHandler(async (req) => {
 *   const data = await fetchData();
 *   return NextResponse.json(data);
 * }, { route: "GET /api/example" });
 * ```
 */
export function createApiHandler(
  handler: ApiHandler,
  options: HandlerOptions = {}
): ApiHandler {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      const apiError = mapToApiError(error);

      // Log error (skip 4xx client errors from detailed logging)
      if (apiError.status >= 500) {
        logError(`API Error: ${options.route || "unknown route"}`, {
          code: apiError.code,
          message: apiError.message,
          status: apiError.status,
          details: apiError.details,
        });

        // Capture in monitoring (Sentry)
        captureException(error, {
          route: options.route,
          errorCode: apiError.code,
        });
      }

      return buildErrorResponse(apiError);
    }
  };
}

/**
 * Wrap an API handler that has route params
 * 
 * @example
 * ```ts
 * export const GET = createApiHandlerWithParams<{ id: string }>(
 *   async (req, { params }) => {
 *     const { id } = await params;
 *     return NextResponse.json({ id });
 *   },
 *   { route: "GET /api/items/[id]" }
 * );
 * ```
 */
export function createApiHandlerWithParams<T>(
  handler: ApiHandlerWithParams<T>,
  options: HandlerOptions = {}
): ApiHandlerWithParams<T> {
  return async (req: NextRequest, context: { params: Promise<T> }) => {
    try {
      return await handler(req, context);
    } catch (error) {
      const apiError = mapToApiError(error);

      if (apiError.status >= 500) {
        logError(`API Error: ${options.route || "unknown route"}`, {
          code: apiError.code,
          message: apiError.message,
          status: apiError.status,
          details: apiError.details,
        });

        captureException(error, {
          route: options.route,
          errorCode: apiError.code,
        });
      }

      return buildErrorResponse(apiError);
    }
  };
}
