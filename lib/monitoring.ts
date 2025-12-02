/**
 * Monitoring & Error Tracking
 * 
 * Sentry-ready wrapper that captures exceptions when SENTRY_DSN is configured.
 * Falls back to console logging when Sentry is not available.
 * 
 * To enable Sentry:
 * 1. Install: npm install @sentry/nextjs
 * 2. Set SENTRY_DSN environment variable
 */

// =============================================================================
// TYPES
// =============================================================================

interface ExceptionContext {
  route?: string;
  errorCode?: string;
  userId?: string;
  agencyId?: string;
  [key: string]: unknown;
}

// Minimal Sentry interface for type safety without requiring the package
interface SentryLike {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: unknown) => void;
  captureMessage: (message: string, level?: string) => void;
  setUser: (user: { id: string; email?: string; name?: string } | null) => void;
  addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
  withScope: (callback: (scope: ScopeLike) => void) => void;
}

interface ScopeLike {
  setExtra: (key: string, value: unknown) => void;
}

// =============================================================================
// SENTRY CONFIGURATION
// =============================================================================

const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Lazy-loaded Sentry instance
let sentryInitialized = false;
let Sentry: SentryLike | null = null;

/**
 * Initialize Sentry if DSN is configured
 */
async function initSentry(): Promise<void> {
  if (sentryInitialized) return;
  sentryInitialized = true;

  if (!SENTRY_DSN) {
    if (IS_PRODUCTION) {
      console.warn("[MONITORING] SENTRY_DSN not configured - error tracking disabled");
    }
    return;
  }

  try {
    // Dynamic import to avoid bundling Sentry when not used
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SentryModule = await (Function('return import("@sentry/nextjs")')() as Promise<SentryLike>);
    Sentry = SentryModule;
    
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,
      enabled: IS_PRODUCTION,
    });

    console.log("[MONITORING] Sentry initialized");
  } catch {
    // Sentry not installed - this is expected in development
    console.log("[MONITORING] Sentry not available - using console logging");
    Sentry = null;
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Capture an exception for monitoring
 * 
 * If Sentry is configured, sends the error to Sentry.
 * Otherwise, logs to console in development.
 */
export function captureException(
  error: unknown,
  context?: ExceptionContext
): void {
  // Initialize Sentry on first use
  if (!sentryInitialized) {
    initSentry().catch(console.error);
  }

  // Log to console in development
  if (!IS_PRODUCTION) {
    console.error("[MONITORING] Exception captured:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
    });
  }

  // Send to Sentry if available
  if (Sentry && SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      if (error instanceof Error) {
        Sentry!.captureException(error);
      } else {
        Sentry!.captureMessage(String(error), "error");
      }
    });
  }
}

/**
 * Capture a message for monitoring
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: ExceptionContext
): void {
  if (!sentryInitialized) {
    initSentry().catch(console.error);
  }

  if (!IS_PRODUCTION) {
    console.log(`[MONITORING] ${level.toUpperCase()}: ${message}`, context);
  }

  if (Sentry && SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      Sentry!.captureMessage(message, level);
    });
  }
}

/**
 * Set user context for monitoring
 */
export function setUser(user: { id: string; email?: string; name?: string } | null): void {
  if (!sentryInitialized) {
    initSentry().catch(console.error);
  }

  if (Sentry && SENTRY_DSN) {
    Sentry.setUser(user);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: "debug" | "info" | "warning" | "error";
  data?: Record<string, unknown>;
}): void {
  if (Sentry && SENTRY_DSN) {
    Sentry.addBreadcrumb({
      ...breadcrumb,
      level: breadcrumb.level || "info",
    });
  }
}

/**
 * Check if monitoring is enabled
 */
export function isMonitoringEnabled(): boolean {
  return !!SENTRY_DSN;
}
