/**
 * Instagram Social Provider
 *
 * Handles publishing content to Instagram via the Graph API.
 * 
 * Status: Structured HTTP client ready for API integration.
 * TODO: Complete OAuth flow via Facebook Business.
 * 
 * Required ENV vars:
 * - INSTAGRAM_APP_ID: Facebook App ID
 * - INSTAGRAM_APP_SECRET: Facebook App Secret
 * - INSTAGRAM_API_BASE_URL: API base URL (default: https://graph.instagram.com/v18.0)
 * - INSTAGRAM_ACCESS_TOKEN: Page access token (after OAuth)
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
// INSTAGRAM PROVIDER
// =============================================================================

class InstagramProvider implements SocialProvider {
  readonly type = "instagram" as const;
  readonly name = "Instagram";

  private get config() {
    return {
      apiBaseUrl: ENV.INSTAGRAM_API_BASE_URL || "https://graph.instagram.com/v18.0",
      accessToken: ENV.INSTAGRAM_ACCESS_TOKEN,
      appId: ENV.INSTAGRAM_APP_ID,
      appSecret: ENV.INSTAGRAM_APP_SECRET,
    };
  }

  isConfigured(): boolean {
    return FEATURES.socialInstagram;
  }

  isReadyToPublish(): boolean {
    return FEATURES.socialInstagramPublish;
  }

  async publish(payload: PublishPayload): Promise<PublishResult> {
    const startTime = Date.now();
    
    logInfo("[Instagram] Publish requested", {
      publicationId: payload.publicationId,
      jobId: payload.jobId,
      contentLength: payload.content.body.length,
    });

    // Demo mode: return stub result
    if (payload.isDemo) {
      return generateDemoResult("instagram", payload);
    }

    // Check if ready to publish
    if (!this.isReadyToPublish()) {
      return generateNotConfiguredResult("instagram");
    }

    try {
      // Format content for Instagram
      const formattedContent = this.formatContent(payload);
      
      // Make API call
      const result = await this.callApi(formattedContent, payload);
      
      const duration = Date.now() - startTime;
      logInfo("[Instagram] Publish completed", {
        publicationId: payload.publicationId,
        success: result.success,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logError("[Instagram] Publish failed", {
        publicationId: payload.publicationId,
        error: error instanceof Error ? error.message : "Unknown error",
        duration,
      });

      throw new SocialPublishError(
        "instagram",
        error instanceof Error ? error.message : "Unknown error",
        error
      );
    }
  }

  /**
   * Format content for Instagram's API requirements.
   */
  private formatContent(payload: PublishPayload): {
    caption: string;
  } {
    let caption = payload.content.body;
    
    // Add hashtags to caption
    const hashtags = (payload.content.hashtags || [])
      .map(tag => tag.startsWith("#") ? tag : `#${tag}`)
      .slice(0, 8); // Instagram allows up to 30, but 5-8 is recommended
    
    if (hashtags.length > 0) {
      caption = `${caption}\n\n${hashtags.join(" ")}`;
    }
    
    // Instagram has a 2200 character limit for captions
    if (caption.length > 2200) {
      caption = caption.slice(0, 2197) + "...";
    }

    return { caption };
  }

  /**
   * Make the actual API call to Instagram Graph API.
   * 
   * Instagram Content Publishing requires:
   * 1. Create a media container (POST /{ig-user-id}/media)
   * 2. Publish the container (POST /{ig-user-id}/media_publish)
   * 
   * For image posts, image_url is required.
   * For carousel posts, children media IDs are required.
   */
  private async callApi(
    content: { caption: string },
    payload: PublishPayload
  ): Promise<PublishResult> {
    const { apiBaseUrl, accessToken } = this.config;

    // Instagram requires an image or video for posts
    if (!payload.mediaUrl) {
      return {
        success: false,
        errorMessage: "Instagram requires an image or video URL for publishing. Text-only posts are not supported.",
        isStub: true,
      };
    }

    try {
      // Step 1: Create media container
      logInfo("[Instagram] Creating media container", {
        endpoint: `${apiBaseUrl}/me/media`,
        hasMedia: !!payload.mediaUrl,
        captionLength: content.caption.length,
      });

      const containerParams = new URLSearchParams({
        image_url: payload.mediaUrl,
        caption: content.caption,
        access_token: accessToken || "",
      });

      const containerResponse = await fetch(`${apiBaseUrl}/me/media?${containerParams}`, {
        method: "POST",
      });

      const containerData = await containerResponse.json();

      if (!containerResponse.ok || containerData.error) {
        logError("[Instagram] Container creation failed", {
          status: containerResponse.status,
          error: containerData.error,
        });
        return {
          success: false,
          errorMessage: containerData.error?.message || `Instagram API error: ${containerResponse.status}`,
          rawResponse: containerData,
        };
      }

      const containerId = containerData.id;
      logInfo("[Instagram] Media container created", { containerId });

      // Step 2: Publish the container
      const publishParams = new URLSearchParams({
        creation_id: containerId,
        access_token: accessToken || "",
      });

      const publishResponse = await fetch(`${apiBaseUrl}/me/media_publish?${publishParams}`, {
        method: "POST",
      });

      const publishData = await publishResponse.json();

      logInfo("[Instagram] API response received", {
        status: publishResponse.status,
        ok: publishResponse.ok,
        hasMediaId: !!publishData?.id,
      });

      if (!publishResponse.ok || publishData.error) {
        return {
          success: false,
          errorMessage: publishData.error?.message || `Instagram publish error: ${publishResponse.status}`,
          rawResponse: publishData,
        };
      }

      const mediaId = publishData.id;
      
      return {
        success: true,
        externalPostId: mediaId,
        externalUrl: `https://www.instagram.com/p/${mediaId}/`,
        rawResponse: publishData,
      };
    } catch (fetchError) {
      logError("[Instagram] API fetch error", {
        error: fetchError instanceof Error ? fetchError.message : "Unknown fetch error",
      });

      return {
        success: false,
        errorMessage: fetchError instanceof Error ? fetchError.message : "Failed to connect to Instagram API",
      };
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

let instance: InstagramProvider | null = null;

export function getInstagramProvider(): SocialProvider {
  if (!instance) {
    instance = new InstagramProvider();
  }
  return instance;
}
