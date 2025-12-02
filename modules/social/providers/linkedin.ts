/**
 * LinkedIn Social Provider
 *
 * Handles publishing content to LinkedIn via the Share API.
 * 
 * Status: Structured HTTP client ready for API integration.
 * TODO: Complete OAuth flow for organization posting.
 * 
 * Required ENV vars:
 * - LINKEDIN_CLIENT_ID: OAuth client ID
 * - LINKEDIN_CLIENT_SECRET: OAuth client secret
 * - LINKEDIN_API_BASE_URL: API base URL (default: https://api.linkedin.com/v2)
 * - LINKEDIN_ACCESS_TOKEN: User/Page access token (after OAuth)
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
// LINKEDIN PROVIDER
// =============================================================================

class LinkedInProvider implements SocialProvider {
  readonly type = "linkedin" as const;
  readonly name = "LinkedIn";

  private get config() {
    return {
      apiBaseUrl: ENV.LINKEDIN_API_BASE_URL || "https://api.linkedin.com/v2",
      accessToken: ENV.LINKEDIN_ACCESS_TOKEN,
      clientId: ENV.LINKEDIN_CLIENT_ID,
      clientSecret: ENV.LINKEDIN_CLIENT_SECRET,
    };
  }

  isConfigured(): boolean {
    return FEATURES.socialLinkedin;
  }

  isReadyToPublish(): boolean {
    return FEATURES.socialLinkedinPublish;
  }

  async publish(payload: PublishPayload): Promise<PublishResult> {
    const startTime = Date.now();
    
    logInfo("[LinkedIn] Publish requested", {
      publicationId: payload.publicationId,
      jobId: payload.jobId,
      contentLength: payload.content.body.length,
    });

    // Demo mode: return stub result
    if (payload.isDemo) {
      return generateDemoResult("linkedin", payload);
    }

    // Check if ready to publish
    if (!this.isReadyToPublish()) {
      return generateNotConfiguredResult("linkedin");
    }

    try {
      // Format content for LinkedIn
      const formattedContent = this.formatContent(payload);
      
      // Make API call
      const result = await this.callApi(formattedContent, payload);
      
      const duration = Date.now() - startTime;
      logInfo("[LinkedIn] Publish completed", {
        publicationId: payload.publicationId,
        success: result.success,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logError("[LinkedIn] Publish failed", {
        publicationId: payload.publicationId,
        error: error instanceof Error ? error.message : "Unknown error",
        duration,
      });

      throw new SocialPublishError(
        "linkedin",
        error instanceof Error ? error.message : "Unknown error",
        error
      );
    }
  }

  /**
   * Format content for LinkedIn's API requirements.
   */
  private formatContent(payload: PublishPayload): {
    text: string;
    hashtags: string[];
  } {
    let text = payload.content.body;
    
    // Format hashtags
    const hashtags = (payload.content.hashtags || [])
      .map(tag => tag.startsWith("#") ? tag : `#${tag}`)
      .slice(0, 5); // LinkedIn recommends 3-5 hashtags
    
    // LinkedIn has a 3000 character limit for posts
    if (text.length > 3000) {
      text = text.slice(0, 2997) + "...";
    }

    return { text, hashtags };
  }

  /**
   * Make the actual API call to LinkedIn Share API.
   * 
   * LinkedIn Share API (UGC Posts):
   * POST /ugcPosts with author URN and shareContent
   * 
   * Note: LinkedIn supports text-only posts (unlike TikTok/Instagram)
   */
  private async callApi(
    content: { text: string; hashtags: string[] },
    payload: PublishPayload
  ): Promise<PublishResult> {
    const { apiBaseUrl, accessToken } = this.config;

    // Build the post text with hashtags
    const fullText = content.hashtags.length > 0
      ? `${content.text}\n\n${content.hashtags.join(" ")}`
      : content.text;

    // LinkedIn UGC Post request body
    // Note: author URN should be fetched from /me endpoint in real implementation
    const requestBody = {
      author: "urn:li:person:me", // Placeholder - should be actual URN
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: fullText,
          },
          shareMediaCategory: payload.mediaUrl ? "IMAGE" : "NONE",
          ...(payload.mediaUrl && {
            media: [{
              status: "READY",
              originalUrl: payload.mediaUrl,
            }],
          }),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    logInfo("[LinkedIn] API request prepared", {
      endpoint: `${apiBaseUrl}/ugcPosts`,
      hasMedia: !!payload.mediaUrl,
      textLength: fullText.length,
    });

    try {
      const response = await fetch(`${apiBaseUrl}/ugcPosts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(requestBody),
      });

      // LinkedIn returns 201 Created on success
      const responseText = await response.text();
      let responseData: Record<string, unknown> = {};
      
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch {
        // Response might be empty on success
      }

      logInfo("[LinkedIn] API response received", {
        status: response.status,
        ok: response.ok,
        hasId: !!responseData?.id,
      });

      if (!response.ok) {
        return {
          success: false,
          errorMessage: (responseData as { message?: string })?.message || `LinkedIn API error: ${response.status}`,
          rawResponse: responseData,
        };
      }

      // Extract post ID from response or X-RestLi-Id header
      const postId = responseData?.id || response.headers.get("X-RestLi-Id");
      
      // LinkedIn post URL format
      const postUrl = postId 
        ? `https://www.linkedin.com/feed/update/${postId}`
        : undefined;
      
      return {
        success: true,
        externalPostId: postId as string | undefined,
        externalUrl: postUrl,
        rawResponse: responseData,
      };
    } catch (fetchError) {
      logError("[LinkedIn] API fetch error", {
        error: fetchError instanceof Error ? fetchError.message : "Unknown fetch error",
      });

      return {
        success: false,
        errorMessage: fetchError instanceof Error ? fetchError.message : "Failed to connect to LinkedIn API",
      };
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

let instance: LinkedInProvider | null = null;

export function getLinkedinProvider(): SocialProvider {
  if (!instance) {
    instance = new LinkedInProvider();
  }
  return instance;
}
