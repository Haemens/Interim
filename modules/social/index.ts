/**
 * Social Module
 *
 * Provides social media publishing capabilities.
 * Supports TikTok, Instagram, and LinkedIn with a pluggable provider architecture.
 */

import type { ChannelType } from "@prisma/client";
import { logWarn } from "@/lib/log";

// Re-export types and base
export {
  type SocialProvider,
  type SocialProviderType,
  type PublishPayload,
  type PublishResult,
  SocialProviderNotConfiguredError,
  SocialPublishError,
  providerIsConfigured,
  generateDemoResult,
  generateNotConfiguredResult,
} from "./providers/base";

// Re-export publish logic
export {
  executePublish,
  PublishError,
  MAX_PUBLISH_ATTEMPTS,
  type PublishContext,
  type PublishOutcome,
  type PublishErrorCode,
} from "./publish";

// Import providers
import { getTiktokProvider } from "./providers/tiktok";
import { getInstagramProvider } from "./providers/instagram";
import { getLinkedinProvider } from "./providers/linkedin";
import type { SocialProvider, SocialProviderType } from "./providers/base";

// =============================================================================
// PROVIDER FACTORY
// =============================================================================

/**
 * Get a social provider by type.
 *
 * @param providerType - The provider type (tiktok, instagram, linkedin)
 * @returns The provider instance or null if not supported
 */
export function getProvider(providerType: SocialProviderType): SocialProvider | null {
  switch (providerType) {
    case "tiktok":
      return getTiktokProvider();
    case "instagram":
      return getInstagramProvider();
    case "linkedin":
      return getLinkedinProvider();
    default:
      return null;
  }
}

/**
 * Map a channel type to a social provider type.
 *
 * @param channelType - The channel type from the database
 * @returns The corresponding social provider type or null
 */
export function channelTypeToProviderType(channelType: ChannelType): SocialProviderType | null {
  const mapping: Partial<Record<ChannelType, SocialProviderType>> = {
    TIKTOK: "tiktok",
    INSTAGRAM: "instagram",
    LINKEDIN: "linkedin",
  };
  return mapping[channelType] || null;
}

/**
 * Get a social provider for a channel type.
 *
 * @param channelType - The channel type from the database
 * @returns The provider instance or null if not supported
 */
export function getProviderForChannelType(channelType: ChannelType): SocialProvider | null {
  const providerType = channelTypeToProviderType(channelType);
  if (!providerType) {
    logWarn("No social provider for channel type", { channelType });
    return null;
  }
  return getProvider(providerType);
}

/**
 * Get all available providers.
 *
 * @returns Array of all provider instances
 */
export function getAllProviders(): SocialProvider[] {
  return [
    getTiktokProvider(),
    getInstagramProvider(),
    getLinkedinProvider(),
  ];
}

/**
 * Get all configured providers.
 *
 * @returns Array of providers that have API keys configured
 */
export function getConfiguredProviders(): SocialProvider[] {
  return getAllProviders().filter((p) => p.isConfigured());
}
