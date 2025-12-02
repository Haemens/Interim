/**
 * Social Provider Base Interface
 *
 * Defines the contract for social media publishing providers.
 * Each provider (TikTok, Instagram, LinkedIn) implements this interface.
 */

import { FEATURES } from "@/lib/env";
import { logInfo, logWarn, logError } from "@/lib/log";

// =============================================================================
// TYPES
// =============================================================================

export type SocialProviderType = "tiktok" | "instagram" | "linkedin";

export interface PublishPayload {
  /** Channel ID from our database */
  channelId: string;
  /** Content to publish */
  content: {
    title?: string;
    body: string;
    hashtags?: string[];
  };
  /** Optional media URL for image/video posts */
  mediaUrl?: string | null;
  /** Job ID for tracking */
  jobId: string;
  /** Publication ID for tracking */
  publicationId: string;
  /** Agency ID for tenant context */
  agencyId: string;
  /** If true, this is a demo agency - don't make real API calls */
  isDemo?: boolean;
}

export interface PublishResult {
  /** Whether the publish was successful */
  success: boolean;
  /** External post ID from the social platform */
  externalPostId?: string;
  /** URL to the published post */
  externalUrl?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Raw response data for debugging */
  rawResponse?: unknown;
  /** Whether this was a stub/demo response */
  isStub?: boolean;
}

export interface ProviderConfig {
  apiBaseUrl: string;
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
}

// =============================================================================
// PROVIDER INTERFACE
// =============================================================================

/**
 * Social media provider interface.
 *
 * Implementations should handle:
 * - Authentication with the platform
 * - Content formatting for the platform
 * - Publishing the content
 * - Returning success/failure status
 */
export interface SocialProvider {
  /** Provider type identifier */
  readonly type: SocialProviderType;

  /** Human-readable name */
  readonly name: string;

  /**
   * Check if the provider is configured for OAuth (has client credentials).
   * @returns true if OAuth credentials are configured
   */
  isConfigured(): boolean;

  /**
   * Check if the provider is ready to publish (has access token).
   * @returns true if access token is available
   */
  isReadyToPublish(): boolean;

  /**
   * Publish content to the social platform.
   * @param payload - Content and metadata to publish
   * @returns Result with success status and external IDs
   */
  publish(payload: PublishPayload): Promise<PublishResult>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a provider type is configured for publishing.
 */
export function providerIsConfigured(type: SocialProviderType): boolean {
  switch (type) {
    case "tiktok":
      return FEATURES.socialTiktokPublish;
    case "instagram":
      return FEATURES.socialInstagramPublish;
    case "linkedin":
      return FEATURES.socialLinkedinPublish;
    default:
      return false;
  }
}

/**
 * Generate a demo/stub publish result.
 */
export function generateDemoResult(
  type: SocialProviderType,
  payload: PublishPayload
): PublishResult {
  const timestamp = Date.now();
  const demoUrls: Record<SocialProviderType, string> = {
    tiktok: `https://www.tiktok.com/@demo/video/${timestamp}`,
    instagram: `https://www.instagram.com/p/demo${timestamp}/`,
    linkedin: `https://www.linkedin.com/feed/update/urn:li:share:demo${timestamp}`,
  };

  logInfo(`[${type}] Demo publish - returning stub result`, {
    publicationId: payload.publicationId,
    jobId: payload.jobId,
  });

  return {
    success: true,
    externalPostId: `demo_${type}_${timestamp}`,
    externalUrl: demoUrls[type],
    isStub: true,
  };
}

/**
 * Generate a "not configured" result.
 */
export function generateNotConfiguredResult(type: SocialProviderType): PublishResult {
  logWarn(`[${type}] Provider not configured for publishing`);
  return {
    success: false,
    errorMessage: `${type.charAt(0).toUpperCase() + type.slice(1)} API is not configured. Set the required environment variables.`,
    isStub: true,
  };
}

// =============================================================================
// ERRORS
// =============================================================================

export class SocialProviderNotConfiguredError extends Error {
  constructor(provider: SocialProviderType) {
    super(`Social provider ${provider} is not configured. Set the required API keys in environment.`);
    this.name = "SocialProviderNotConfiguredError";
  }
}

export class SocialPublishError extends Error {
  constructor(
    provider: SocialProviderType,
    message: string,
    public readonly cause?: unknown
  ) {
    super(`[${provider}] ${message}`);
    this.name = "SocialPublishError";
  }
}
