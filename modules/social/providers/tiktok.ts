/**
 * TikTok Social Provider
 *
 * Handles publishing content to TikTok via the Content Posting API.
 * 
 * Status: Structured HTTP client ready for API integration.
 * TODO: Complete OAuth flow and video upload implementation.
 * 
 * Required ENV vars:
 * - TIKTOK_CLIENT_KEY: OAuth client key
 * - TIKTOK_CLIENT_SECRET: OAuth client secret
 * - TIKTOK_API_BASE_URL: API base URL (default: https://open.tiktokapis.com/v2)
 * - TIKTOK_ACCESS_TOKEN: User access token (after OAuth)
 */

import { ENV, FEATURES } from "@/lib/env";
import { logInfo, logWarn, logError } from "@/lib/log";
import {
  type SocialProvider,
  type PublishPayload,
  type PublishResult,
  SocialPublishError,
  generateDemoResult,
  generateNotConfiguredResult,
} from "./base";

// =============================================================================
// TIKTOK PROVIDER
// =============================================================================

class TikTokProvider implements SocialProvider {
  readonly type = "tiktok" as const;
  readonly name = "TikTok";

  private get config() {
    return {
      apiBaseUrl: ENV.TIKTOK_API_BASE_URL || "https://open.tiktokapis.com/v2",
      accessToken: ENV.TIKTOK_ACCESS_TOKEN,
      clientKey: ENV.TIKTOK_CLIENT_KEY,
      clientSecret: ENV.TIKTOK_CLIENT_SECRET,
    };
  }

  isConfigured(): boolean {
    return FEATURES.socialTiktok;
  }

  isReadyToPublish(): boolean {
    return FEATURES.socialTiktokPublish;
  }

  async publish(payload: PublishPayload): Promise<PublishResult> {
    const startTime = Date.now();
    
    logInfo("[TikTok] Publish requested", {
      publicationId: payload.publicationId,
      jobId: payload.jobId,
      contentLength: payload.content.body.length,
    });

    // Demo mode: return stub result
    if (payload.isDemo) {
      return generateDemoResult("tiktok", payload);
    }

    // Check if ready to publish
    if (!this.isReadyToPublish()) {
      return generateNotConfiguredResult("tiktok");
    }

    try {
      // Format content for TikTok
      const formattedContent = this.formatContent(payload);
      
      // Make API call
      const result = await this.callApi(formattedContent, payload);
      
      const duration = Date.now() - startTime;
      logInfo("[TikTok] Publish completed", {
        publicationId: payload.publicationId,
        success: result.success,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logError("[TikTok] Publish failed", {
        publicationId: payload.publicationId,
        error: error instanceof Error ? error.message : "Unknown error",
        duration,
      });

      throw new SocialPublishError(
        "tiktok",
        error instanceof Error ? error.message : "Unknown error",
        error
      );
    }
  }

  /**
   * Format content for TikTok's API requirements.
   */
  private formatContent(payload: PublishPayload): {
    text: string;
    hashtags: string[];
  } {
    let text = payload.content.body;
    
    // TikTok has a 2200 character limit for captions
    if (text.length > 2200) {
      text = text.slice(0, 2197) + "...";
    }

    // Format hashtags
    const hashtags = (payload.content.hashtags || [])
      .map(tag => tag.startsWith("#") ? tag : `#${tag}`)
      .slice(0, 5); // TikTok recommends 3-5 hashtags

    return { text, hashtags };
  }

  /**
   * Make the actual API call to TikTok.
   * 
   * TODO: This is a placeholder implementation.
   * TikTok's Content Posting API requires:
   * 1. Video upload first (not text-only posts)
   * 2. POST to /v2/post/publish/video/init
   * 3. Handle async video processing
   */
  private async callApi(
    content: { text: string; hashtags: string[] },
    payload: PublishPayload
  ): Promise<PublishResult> {
    const { apiBaseUrl, accessToken } = this.config;

    // TikTok doesn't support text-only posts - video is required
    // This is a structured placeholder for when video support is added
    
    const requestBody = {
      post_info: {
        title: payload.content.title || "",
        description: `${content.text}\n\n${content.hashtags.join(" ")}`,
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: payload.mediaUrl || null,
      },
    };

    logInfo("[TikTok] API request prepared", {
      endpoint: `${apiBaseUrl}/post/publish/video/init/`,
      hasVideo: !!payload.mediaUrl,
      descriptionLength: requestBody.post_info.description.length,
    });

    // If no video URL, we can't publish to TikTok
    if (!payload.mediaUrl) {
      return {
        success: false,
        errorMessage: "TikTok requires a video URL for publishing. Text-only posts are not supported.",
        isStub: true,
      };
    }

    try {
      const response = await fetch(`${apiBaseUrl}/post/publish/video/init/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      logInfo("[TikTok] API response received", {
        status: response.status,
        ok: response.ok,
        hasPublishId: !!responseData?.data?.publish_id,
      });

      if (!response.ok) {
        return {
          success: false,
          errorMessage: responseData?.error?.message || `TikTok API error: ${response.status}`,
          rawResponse: responseData,
        };
      }

      // TikTok returns a publish_id for async processing
      const publishId = responseData?.data?.publish_id;
      
      return {
        success: true,
        externalPostId: publishId,
        // TikTok doesn't return the final URL immediately (async processing)
        externalUrl: publishId ? `https://www.tiktok.com/publish/status/${publishId}` : undefined,
        rawResponse: responseData,
      };
    } catch (fetchError) {
      logError("[TikTok] API fetch error", {
        error: fetchError instanceof Error ? fetchError.message : "Unknown fetch error",
      });

      return {
        success: false,
        errorMessage: fetchError instanceof Error ? fetchError.message : "Failed to connect to TikTok API",
      };
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

let instance: TikTokProvider | null = null;

export function getTiktokProvider(): SocialProvider {
  if (!instance) {
    instance = new TikTokProvider();
  }
  return instance;
}
