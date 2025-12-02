/**
 * Environment Configuration & Validation
 * 
 * Provides type-safe access to environment variables with:
 * - Required vs optional distinction
 * - Production-only requirements
 * - Safe fallbacks for development
 * - Clear error messages for missing critical vars
 */

// =============================================================================
// HELPERS
// =============================================================================

interface GetEnvOptions {
  /** Only required in production */
  prodOnly?: boolean;
  /** Default value if not set */
  defaultValue?: string;
}

/**
 * Check if we're in build phase (Next.js sets this during build)
 * During build, we should not throw errors for missing env vars
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Get a required environment variable
 * Throws in production runtime if missing, warns in development/build
 */
function getRequiredEnv(key: string, options: GetEnvOptions = {}): string {
  const value = process.env[key];
  const isProduction = process.env.NODE_ENV === "production";

  if (value) {
    return value;
  }

  // If prodOnly and we're not in production, return empty string
  if (options.prodOnly && !isProduction) {
    return options.defaultValue ?? "";
  }

  // If we have a default, use it
  if (options.defaultValue !== undefined) {
    return options.defaultValue;
  }

  // During build phase, don't throw - just return empty string
  // The actual runtime will have the env vars from Vercel
  if (isBuildPhase) {
    return options.defaultValue ?? "";
  }

  // In production runtime, throw for missing required vars
  if (isProduction) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `This variable is required for production deployment.`
    );
  }

  // In development, warn and return empty string
  console.warn(
    `[ENV] Missing environment variable: ${key}. ` +
    `This may cause issues. Set it in .env.local`
  );
  return "";
}

/**
 * Get an optional environment variable
 * Returns undefined if not set
 */
function getOptionalEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

/**
 * Get a boolean environment variable
 */
function getBoolEnv(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value === "true" || value === "1";
}

/**
 * Get a numeric environment variable
 */
function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

/**
 * Centralized environment configuration
 * 
 * Usage:
 *   import { ENV } from "@/lib/env";
 *   const dbUrl = ENV.DATABASE_URL;
 */
export const ENV = {
  // Runtime
  NODE_ENV: process.env.NODE_ENV ?? "development",
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV !== "production",

  // Database
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),

  // Authentication
  NEXTAUTH_URL: getRequiredEnv("NEXTAUTH_URL", { defaultValue: "http://localhost:3000" }),
  NEXTAUTH_SECRET: getRequiredEnv("NEXTAUTH_SECRET", { prodOnly: true }),

  // Stripe
  STRIPE_SECRET_KEY: getRequiredEnv("STRIPE_SECRET_KEY", { prodOnly: true }),
  STRIPE_WEBHOOK_SECRET: getOptionalEnv("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PUBLISHABLE_KEY: getOptionalEnv("STRIPE_PUBLISHABLE_KEY"),
  STRIPE_PRICE_PRO: getOptionalEnv("STRIPE_PRICE_PRO"),
  STRIPE_PRICE_AGENCY_PLUS: getOptionalEnv("STRIPE_PRICE_AGENCY_PLUS"),

  // Storage (S3-compatible)
  STORAGE_BUCKET: getOptionalEnv("STORAGE_BUCKET"),
  STORAGE_ACCESS_KEY_ID: getOptionalEnv("STORAGE_ACCESS_KEY_ID"),
  STORAGE_SECRET_ACCESS_KEY: getOptionalEnv("STORAGE_SECRET_ACCESS_KEY"),
  STORAGE_ENDPOINT: getOptionalEnv("STORAGE_ENDPOINT"),
  STORAGE_PUBLIC_BASE_URL: getOptionalEnv("STORAGE_PUBLIC_BASE_URL"),
  STORAGE_REGION: getOptionalEnv("STORAGE_REGION", "auto"),

  // Redis (Upstash-compatible)
  REDIS_URL: getOptionalEnv("REDIS_URL"),
  REDIS_TOKEN: getOptionalEnv("REDIS_TOKEN"),

  // Email
  EMAIL_PROVIDER: getOptionalEnv("EMAIL_PROVIDER", "console"), // console, resend, sendgrid
  EMAIL_FROM_DEFAULT: getOptionalEnv("EMAIL_FROM_DEFAULT", "QuestHire <noreply@questhire.com>"),
  RESEND_API_KEY: getOptionalEnv("RESEND_API_KEY"),
  SENDGRID_API_KEY: getOptionalEnv("SENDGRID_API_KEY"),

  // Monitoring
  SENTRY_DSN: getOptionalEnv("SENTRY_DSN"),

  // App
  NEXT_PUBLIC_APP_URL: getOptionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: getOptionalEnv("NEXT_PUBLIC_APP_NAME", "QuestHire"),

  // AI Provider (OpenAI / Claude)
  AI_PROVIDER: getOptionalEnv("AI_PROVIDER", "openai"), // openai, anthropic
  OPENAI_API_KEY: getOptionalEnv("OPENAI_API_KEY"),
  OPENAI_MODEL: getOptionalEnv("OPENAI_MODEL", "gpt-4o"),
  ANTHROPIC_API_KEY: getOptionalEnv("ANTHROPIC_API_KEY"),
  ANTHROPIC_MODEL: getOptionalEnv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),

  // Social Providers (for future OAuth integration)
  TIKTOK_CLIENT_KEY: getOptionalEnv("TIKTOK_CLIENT_KEY"),
  TIKTOK_CLIENT_SECRET: getOptionalEnv("TIKTOK_CLIENT_SECRET"),
  TIKTOK_API_BASE_URL: getOptionalEnv("TIKTOK_API_BASE_URL", "https://open.tiktokapis.com/v2"),
  TIKTOK_ACCESS_TOKEN: getOptionalEnv("TIKTOK_ACCESS_TOKEN"),
  
  INSTAGRAM_APP_ID: getOptionalEnv("INSTAGRAM_APP_ID"),
  INSTAGRAM_APP_SECRET: getOptionalEnv("INSTAGRAM_APP_SECRET"),
  INSTAGRAM_API_BASE_URL: getOptionalEnv("INSTAGRAM_API_BASE_URL", "https://graph.instagram.com/v18.0"),
  INSTAGRAM_ACCESS_TOKEN: getOptionalEnv("INSTAGRAM_ACCESS_TOKEN"),
  
  LINKEDIN_CLIENT_ID: getOptionalEnv("LINKEDIN_CLIENT_ID"),
  LINKEDIN_CLIENT_SECRET: getOptionalEnv("LINKEDIN_CLIENT_SECRET"),
  LINKEDIN_API_BASE_URL: getOptionalEnv("LINKEDIN_API_BASE_URL", "https://api.linkedin.com/v2"),
  LINKEDIN_ACCESS_TOKEN: getOptionalEnv("LINKEDIN_ACCESS_TOKEN"),

  // Cron Security
  CRON_SECRET: getOptionalEnv("CRON_SECRET"),

  // Feature Flags
  ENABLE_FEEDBACK_SYNC: getBoolEnv("ENABLE_FEEDBACK_SYNC", false),
} as const;

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate that all critical environment variables are set
 * Call this at app startup to fail fast
 */
export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const isProduction = ENV.IS_PRODUCTION;

  // Always required
  if (!ENV.DATABASE_URL) {
    errors.push("DATABASE_URL is required");
  }

  // Required in production
  if (isProduction) {
    if (!ENV.NEXTAUTH_SECRET) {
      errors.push("NEXTAUTH_SECRET is required in production");
    }
    if (!ENV.STRIPE_SECRET_KEY) {
      errors.push("STRIPE_SECRET_KEY is required in production");
    }
    if (!ENV.STRIPE_WEBHOOK_SECRET) {
      errors.push("STRIPE_WEBHOOK_SECRET is required in production");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a feature is configured and available
 */
export const FEATURES = {
  /** Is file storage configured? */
  storage: !!(ENV.STORAGE_BUCKET && ENV.STORAGE_ACCESS_KEY_ID && ENV.STORAGE_SECRET_ACCESS_KEY),
  
  /** Is Redis configured for rate limiting? */
  redis: !!(ENV.REDIS_URL),
  
  /** Is email sending configured? */
  email: ENV.IS_PRODUCTION && (!!ENV.RESEND_API_KEY || !!ENV.SENDGRID_API_KEY),
  
  /** Is error monitoring configured? */
  monitoring: !!ENV.SENTRY_DSN,
  
  /** Is Stripe configured? */
  stripe: !!ENV.STRIPE_SECRET_KEY,

  /** Is AI content generation configured? */
  ai: !!(ENV.OPENAI_API_KEY || ENV.ANTHROPIC_API_KEY),

  /** Are social providers configured for OAuth? */
  socialTiktok: !!(ENV.TIKTOK_CLIENT_KEY && ENV.TIKTOK_CLIENT_SECRET),
  socialInstagram: !!(ENV.INSTAGRAM_APP_ID && ENV.INSTAGRAM_APP_SECRET),
  socialLinkedin: !!(ENV.LINKEDIN_CLIENT_ID && ENV.LINKEDIN_CLIENT_SECRET),

  /** Are social providers ready for publishing (have access tokens)? */
  socialTiktokPublish: !!(ENV.TIKTOK_ACCESS_TOKEN),
  socialInstagramPublish: !!(ENV.INSTAGRAM_ACCESS_TOKEN),
  socialLinkedinPublish: !!(ENV.LINKEDIN_ACCESS_TOKEN),

  /** Is feedback-to-application sync enabled? */
  feedbackSync: ENV.ENABLE_FEEDBACK_SYNC,
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export { getRequiredEnv, getOptionalEnv, getBoolEnv, getNumberEnv };
