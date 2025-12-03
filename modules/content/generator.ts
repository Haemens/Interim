/**
 * Social Content Generator
 *
 * Generates social media content variants for job postings.
 * Supports both template-based generation and AI-powered generation.
 */

import { db } from "@/lib/db";
import { logInfo, logError } from "@/lib/log";
import { isDemoAgency } from "@/modules/auth/demo-mode";
import {
  generateContentWithAI,
  isAiConfigured,
  AiNotConfiguredError,
  type AiTone,
  type AiChannel,
} from "../ai";

// =============================================================================
// TYPES
// =============================================================================

export type ContentVariantType =
  | "TIKTOK_SCRIPT"
  | "INSTAGRAM_CAPTION"
  | "LINKEDIN_POST"
  | "FACEBOOK_POST"
  | "WHATSAPP_MESSAGE"
  | "GENERIC_SNIPPET";

export interface GeneratedContentVariant {
  variant: ContentVariantType;
  title?: string;
  body: string;
  suggestedHashtags?: string;
}

export interface JobInput {
  id: string;
  title: string;
  location?: string | null;
  contractType?: string | null;
  sector?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  description: string;
  profile?: string | null;
  benefits?: string | null;
  tags?: string[];
}

export interface AgencyInput {
  id: string;
  name: string;
  slug: string;
}

export interface GenerateParams {
  job: JobInput;
  agency: AgencyInput;
  language?: string; // default "fr"
}

// =============================================================================
// HELPERS
// =============================================================================

function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined
): string {
  const curr = currency || "EUR";
  if (min && max) {
    return `${min.toLocaleString("fr-FR")} - ${max.toLocaleString("fr-FR")} ${curr}`;
  }
  if (min) {
    return `À partir de ${min.toLocaleString("fr-FR")} ${curr}`;
  }
  if (max) {
    return `Jusqu'à ${max.toLocaleString("fr-FR")} ${curr}`;
  }
  return "";
}

function extractKeyPoints(text: string | null | undefined, maxPoints: number = 3): string[] {
  if (!text) return [];
  // Split by common delimiters and take first N non-empty lines
  const lines = text
    .split(/[\n•\-\*]/)
    .map((l) => l.trim())
    .filter((l) => l.length > 10 && l.length < 100);
  return lines.slice(0, maxPoints);
}

function generateHashtags(job: JobInput, agency: AgencyInput): string {
  const tags: string[] = [];

  // Add sector-based hashtags
  if (job.sector) {
    const sectorTag = job.sector
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);
    if (sectorTag) tags.push(`#${sectorTag}`);
  }

  // Add location-based hashtags
  if (job.location) {
    const locationTag = job.location
      .split(",")[0]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20);
    if (locationTag) tags.push(`#${locationTag}`);
  }

  // Add contract type
  if (job.contractType) {
    const contractTag = job.contractType
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (contractTag) tags.push(`#${contractTag}`);
  }

  // Add job tags
  if (job.tags && job.tags.length > 0) {
    job.tags.slice(0, 3).forEach((tag) => {
      const cleanTag = tag
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 15);
      if (cleanTag && cleanTag.length > 2) tags.push(`#${cleanTag}`);
    });
  }

  // Add common recruitment hashtags
  tags.push("#recrutement", "#emploi", "#job");

  // Add agency hashtag
  const agencyTag = agency.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  if (agencyTag) tags.push(`#${agencyTag}`);

  // Deduplicate and limit
  return [...new Set(tags)].slice(0, 10).join(" ");
}

// =============================================================================
// CONTENT GENERATORS
// =============================================================================

function generateTikTokScript(job: JobInput, agency: AgencyInput, language: string): GeneratedContentVariant {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const location = job.location || "France";

  // TikTok style: hook, quick info, call to action
  const lines: string[] = [];

  // Hook
  if (language === "fr") {
    lines.push(`🔥 On recrute un(e) ${job.title} !`);
    lines.push("");
    lines.push(`📍 ${location}`);
    if (job.contractType) lines.push(`📝 ${job.contractType}`);
    if (salary) lines.push(`💰 ${salary}`);
    lines.push("");
    if (job.sector) lines.push(`Secteur : ${job.sector}`);
    lines.push("");
    lines.push("👉 Lien en bio pour postuler !");
    lines.push(`Rejoins l'équipe ${agency.name} 🚀`);
  } else {
    lines.push(`🔥 We're hiring a ${job.title}!`);
    lines.push("");
    lines.push(`📍 ${location}`);
    if (job.contractType) lines.push(`📝 ${job.contractType}`);
    if (salary) lines.push(`💰 ${salary}`);
    lines.push("");
    if (job.sector) lines.push(`Sector: ${job.sector}`);
    lines.push("");
    lines.push("👉 Link in bio to apply!");
    lines.push(`Join the ${agency.name} team 🚀`);
  }

  return {
    variant: "TIKTOK_SCRIPT",
    title: language === "fr" ? `Script TikTok - ${job.title}` : `TikTok Script - ${job.title}`,
    body: lines.join("\n"),
    suggestedHashtags: generateHashtags(job, agency),
  };
}

function generateInstagramCaption(job: JobInput, agency: AgencyInput, language: string): GeneratedContentVariant {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const location = job.location || "France";
  const benefits = extractKeyPoints(job.benefits, 3);
  const profile = extractKeyPoints(job.profile, 2);

  const lines: string[] = [];

  if (language === "fr") {
    lines.push(`✨ OFFRE D'EMPLOI ✨`);
    lines.push("");
    lines.push(`🎯 ${job.title}`);
    lines.push(`📍 ${location}`);
    if (job.contractType) lines.push(`📝 ${job.contractType}`);
    if (salary) lines.push(`💰 ${salary}`);
    lines.push("");

    if (benefits.length > 0) {
      lines.push("🎁 Avantages :");
      benefits.forEach((b) => lines.push(`• ${b}`));
      lines.push("");
    }

    if (profile.length > 0) {
      lines.push("👤 Profil recherché :");
      profile.forEach((p) => lines.push(`• ${p}`));
      lines.push("");
    }

    lines.push("📲 Postule maintenant !");
    lines.push("👉 Lien en bio ou envoie-nous un DM");
    lines.push("");
    lines.push(`${agency.name} recrute ! 🚀`);
  } else {
    lines.push(`✨ JOB OPENING ✨`);
    lines.push("");
    lines.push(`🎯 ${job.title}`);
    lines.push(`📍 ${location}`);
    if (job.contractType) lines.push(`📝 ${job.contractType}`);
    if (salary) lines.push(`💰 ${salary}`);
    lines.push("");

    if (benefits.length > 0) {
      lines.push("🎁 Benefits:");
      benefits.forEach((b) => lines.push(`• ${b}`));
      lines.push("");
    }

    if (profile.length > 0) {
      lines.push("👤 We're looking for:");
      profile.forEach((p) => lines.push(`• ${p}`));
      lines.push("");
    }

    lines.push("📲 Apply now!");
    lines.push("👉 Link in bio or send us a DM");
    lines.push("");
    lines.push(`${agency.name} is hiring! 🚀`);
  }

  return {
    variant: "INSTAGRAM_CAPTION",
    title: language === "fr" ? `Caption Instagram - ${job.title}` : `Instagram Caption - ${job.title}`,
    body: lines.join("\n"),
    suggestedHashtags: generateHashtags(job, agency),
  };
}

function generateLinkedInPost(job: JobInput, agency: AgencyInput, language: string): GeneratedContentVariant {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const location = job.location || "France";
  const benefits = extractKeyPoints(job.benefits, 4);
  const profile = extractKeyPoints(job.profile, 3);

  const lines: string[] = [];

  if (language === "fr") {
    lines.push(`🚀 ${agency.name} recrute !`);
    lines.push("");
    lines.push(`Nous recherchons un(e) **${job.title}** pour rejoindre notre équipe.`);
    lines.push("");
    lines.push(`📍 Localisation : ${location}`);
    if (job.contractType) lines.push(`📝 Type de contrat : ${job.contractType}`);
    if (job.sector) lines.push(`🏢 Secteur : ${job.sector}`);
    if (salary) lines.push(`💰 Rémunération : ${salary}`);
    lines.push("");

    // Description excerpt
    const descExcerpt = job.description.slice(0, 200).trim();
    lines.push(`📋 Mission :`);
    lines.push(`${descExcerpt}${job.description.length > 200 ? "..." : ""}`);
    lines.push("");

    if (profile.length > 0) {
      lines.push("👤 Profil recherché :");
      profile.forEach((p) => lines.push(`• ${p}`));
      lines.push("");
    }

    if (benefits.length > 0) {
      lines.push("🎁 Ce que nous offrons :");
      benefits.forEach((b) => lines.push(`• ${b}`));
      lines.push("");
    }

    lines.push("📩 Intéressé(e) ? Postulez directement ou contactez-nous en message privé !");
    lines.push("");
    lines.push("N'hésitez pas à partager avec votre réseau 🙏");
  } else {
    lines.push(`🚀 ${agency.name} is hiring!`);
    lines.push("");
    lines.push(`We're looking for a **${job.title}** to join our team.`);
    lines.push("");
    lines.push(`📍 Location: ${location}`);
    if (job.contractType) lines.push(`📝 Contract: ${job.contractType}`);
    if (job.sector) lines.push(`🏢 Sector: ${job.sector}`);
    if (salary) lines.push(`💰 Salary: ${salary}`);
    lines.push("");

    const descExcerpt = job.description.slice(0, 200).trim();
    lines.push(`📋 Role:`);
    lines.push(`${descExcerpt}${job.description.length > 200 ? "..." : ""}`);
    lines.push("");

    if (profile.length > 0) {
      lines.push("👤 What we're looking for:");
      profile.forEach((p) => lines.push(`• ${p}`));
      lines.push("");
    }

    if (benefits.length > 0) {
      lines.push("🎁 What we offer:");
      benefits.forEach((b) => lines.push(`• ${b}`));
      lines.push("");
    }

    lines.push("📩 Interested? Apply directly or reach out via DM!");
    lines.push("");
    lines.push("Feel free to share with your network 🙏");
  }

  return {
    variant: "LINKEDIN_POST",
    title: language === "fr" ? `Post LinkedIn - ${job.title}` : `LinkedIn Post - ${job.title}`,
    body: lines.join("\n"),
    suggestedHashtags: generateHashtags(job, agency),
  };
}

function generateFacebookPost(job: JobInput, agency: AgencyInput, language: string): GeneratedContentVariant {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const location = job.location || "France";
  const benefits = extractKeyPoints(job.benefits, 2);

  const lines: string[] = [];

  if (language === "fr") {
    lines.push(`🚨 OPPORTUNITÉ À SAISIR 🚨`);
    lines.push("");
    lines.push(`Nous recherchons un(e) **${job.title}** sur ${location} !`);
    lines.push("");
    if (salary) lines.push(`💰 Salaire : ${salary}`);
    if (job.contractType) lines.push(`📝 Contrat : ${job.contractType}`);
    lines.push("");
    
    if (benefits.length > 0) {
      lines.push("✅ Avantages :");
      benefits.forEach((b) => lines.push(`- ${b}`));
      lines.push("");
    }

    lines.push(`👉 Pour postuler, cliquez ici : [Lien]`);
    lines.push(`Ou envoyez-nous un message !`);
    lines.push("");
    lines.push("Taguez un ami qui pourrait être intéressé 👇");
  } else {
    lines.push(`🚨 JOB ALERT 🚨`);
    lines.push("");
    lines.push(`We are hiring a **${job.title}** in ${location}!`);
    lines.push("");
    if (salary) lines.push(`💰 Salary: ${salary}`);
    if (job.contractType) lines.push(`📝 Contract: ${job.contractType}`);
    lines.push("");
    
    if (benefits.length > 0) {
      lines.push("✅ Benefits:");
      benefits.forEach((b) => lines.push(`- ${b}`));
      lines.push("");
    }

    lines.push(`👉 To apply, click here: [Link]`);
    lines.push(`Or send us a message!`);
    lines.push("");
    lines.push("Tag a friend who might be interested 👇");
  }

  return {
    variant: "FACEBOOK_POST",
    title: language === "fr" ? `Post Facebook - ${job.title}` : `Facebook Post - ${job.title}`,
    body: lines.join("\n"),
    suggestedHashtags: generateHashtags(job, agency),
  };
}

function generateWhatsAppMessage(job: JobInput, agency: AgencyInput, language: string): GeneratedContentVariant {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.currency);
  const location = job.location || "France";

  const lines: string[] = [];

  if (language === "fr") {
    lines.push(`Bonjour ! 👋`);
    lines.push("");
    lines.push(`${agency.name} a une opportunité pour vous :`);
    lines.push("");
    lines.push(`🎯 *${job.title}*`);
    lines.push(`📍 ${location}`);
    if (job.contractType) lines.push(`📝 ${job.contractType}`);
    if (salary) lines.push(`💰 ${salary}`);
    lines.push("");
    lines.push(`Ça vous intéresse ? Répondez "OUI" et on vous envoie les détails !`);
  } else {
    lines.push(`Hi there! 👋`);
    lines.push("");
    lines.push(`${agency.name} has an opportunity for you:`);
    lines.push("");
    lines.push(`🎯 *${job.title}*`);
    lines.push(`📍 ${location}`);
    if (job.contractType) lines.push(`📝 ${job.contractType}`);
    if (salary) lines.push(`💰 ${salary}`);
    lines.push("");
    lines.push(`Interested? Reply "YES" and we'll send you the details!`);
  }

  return {
    variant: "WHATSAPP_MESSAGE",
    title: language === "fr" ? `Message WhatsApp - ${job.title}` : `WhatsApp Message - ${job.title}`,
    body: lines.join("\n"),
    suggestedHashtags: undefined, // WhatsApp doesn't use hashtags
  };
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate a social content pack for a job posting.
 *
 * Returns 5 content variants:
 * - TIKTOK_SCRIPT: Short, spoken style with hooks and CTA
 * - INSTAGRAM_CAPTION: Medium-length with bullet points and hashtags
 * - LINKEDIN_POST: Formal, structured professional post
 * - FACEBOOK_POST: Community-focused post
 * - WHATSAPP_MESSAGE: Short, direct message for candidate outreach
 *
 * @param params - Job, agency, and optional language (default "fr")
 * @returns Array of generated content variants
 *
 * @example
 * ```ts
 * const contents = await generateSocialPackForJob({
 *   job: { id: "...", title: "Developer", ... },
 *   agency: { id: "...", name: "TechStaff", slug: "techstaff" },
 *   language: "fr"
 * });
 * ```
 */
export async function generateSocialPackForJob(
  params: GenerateParams
): Promise<GeneratedContentVariant[]> {
  const { job, agency, language = "fr" } = params;

  // Generate all variants
  const variants: GeneratedContentVariant[] = [
    generateTikTokScript(job, agency, language),
    generateInstagramCaption(job, agency, language),
    generateLinkedInPost(job, agency, language),
    generateFacebookPost(job, agency, language),
    generateWhatsAppMessage(job, agency, language),
  ];

  return variants;
}

/**
 * Get display label for a content variant
 */
export function getVariantLabel(variant: ContentVariantType, language: string = "fr"): string {
  const labels: Record<ContentVariantType, { fr: string; en: string }> = {
    TIKTOK_SCRIPT: { fr: "Script TikTok", en: "TikTok Script" },
    INSTAGRAM_CAPTION: { fr: "Caption Instagram", en: "Instagram Caption" },
    LINKEDIN_POST: { fr: "Post LinkedIn", en: "LinkedIn Post" },
    FACEBOOK_POST: { fr: "Post Facebook", en: "Facebook Post" },
    WHATSAPP_MESSAGE: { fr: "Message WhatsApp", en: "WhatsApp Message" },
    GENERIC_SNIPPET: { fr: "Extrait générique", en: "Generic Snippet" },
  };

  return labels[variant]?.[language as "fr" | "en"] || labels[variant]?.en || variant;
}

/**
 * Get icon/emoji for a content variant
 */
export function getVariantIcon(variant: ContentVariantType): string {
  const icons: Record<ContentVariantType, string> = {
    TIKTOK_SCRIPT: "🎵",
    INSTAGRAM_CAPTION: "📸",
    LINKEDIN_POST: "💼",
    FACEBOOK_POST: "👥",
    WHATSAPP_MESSAGE: "💬",
    GENERIC_SNIPPET: "📝",
  };

  return icons[variant] || "📝";
}

// =============================================================================
// AI-POWERED GENERATION
// =============================================================================

type MainContentVariant = Exclude<ContentVariantType, "GENERIC_SNIPPET">;
const VARIANT_TO_CHANNEL: Record<MainContentVariant, AiChannel> = {
  TIKTOK_SCRIPT: "tiktok",
  INSTAGRAM_CAPTION: "instagram",
  LINKEDIN_POST: "linkedin",
  FACEBOOK_POST: "facebook",
  WHATSAPP_MESSAGE: "whatsapp",
};

const CHANNEL_TO_VARIANT: Record<AiChannel, ContentVariantType> = {
  tiktok: "TIKTOK_SCRIPT",
  instagram: "INSTAGRAM_CAPTION",
  linkedin: "LINKEDIN_POST",
  facebook: "FACEBOOK_POST",
  whatsapp: "WHATSAPP_MESSAGE",
};

export interface GenerateWithAiParams {
  jobId: string;
  agencyId: string;
  tone?: AiTone;
  language?: string;
  userId?: string;
  /** Agency slug for demo mode detection */
  agencySlug?: string;
}

export interface GeneratedPackResult {
  contents: Array<{
    id: string;
    variant: ContentVariantType;
    title: string | null;
    body: string;
    suggestedHashtags: string | null;
  }>;
  usedAi: boolean;
}

/**
 * Generate a full social content pack using AI.
 *
 * Generates content for all channels (TikTok, Instagram, LinkedIn, Facebook, WhatsApp)
 * using AI, then upserts JobPostContent records.
 *
 * @param params - Job ID, agency ID, optional tone and language
 * @returns Created/updated JobPostContent records
 * @throws AiNotConfiguredError if AI is not configured
 */
export async function generateJobContentPackWithAI(
  params: GenerateWithAiParams
): Promise<GeneratedPackResult> {
  const { jobId, agencyId, tone = "default", language = "fr", userId, agencySlug } = params;

  // Load job from database
  const job = await db.job.findFirst({
    where: { id: jobId, agencyId },
    include: {
      agency: { select: { name: true, slug: true } },
    },
  });

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Check if this is a demo agency
  const isDemo = isDemoAgency({ slug: agencySlug || job.agency.slug });
  if (isDemo) {
    logInfo("AI generation for demo agency - will use demo content", { jobId, agencySlug: job.agency.slug });
  }

  // Check if AI is configured (demo mode can still proceed with stub content)
  if (!isAiConfigured() && !isDemo) {
    logInfo("AI not configured, falling back to template generation", { jobId });
    // Fall back to template-based generation
    const templateVariants = await generateSocialPackForJob({
      job: {
        id: job.id,
        title: job.title,
        location: job.location,
        contractType: job.contractType,
        sector: job.sector,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        description: job.description,
        profile: job.profile,
        benefits: job.benefits,
        tags: job.tags,
      },
      agency: {
        id: agencyId,
        name: job.agency.name,
        slug: "",
      },
      language,
    });

    // Upsert content records
    const contents = await Promise.all(
      templateVariants.map(async (variant) => {
        // Check if content already exists for this variant
        const existing = await db.jobPostContent.findFirst({
          where: { jobId, agencyId, variant: variant.variant },
        });

        if (existing) {
          // Update existing
          return db.jobPostContent.update({
            where: { id: existing.id },
            data: {
              title: variant.title || null,
              body: variant.body,
              suggestedHashtags: variant.suggestedHashtags || null,
              language,
              status: "DRAFT",
              lastEditedById: userId || null,
              lastEditedAt: new Date(),
            },
          });
        } else {
          // Create new
          return db.jobPostContent.create({
            data: {
              jobId,
              agencyId,
              variant: variant.variant,
              title: variant.title || null,
              body: variant.body,
              suggestedHashtags: variant.suggestedHashtags || null,
              language,
              status: "DRAFT",
              createdById: userId || null,
              generatedAt: new Date(),
            },
          });
        }
      })
    );

    return { contents, usedAi: false };
  }

  // Format salary for AI context
  const salaryRange = job.salaryMin || job.salaryMax
    ? `${job.salaryMin ? job.salaryMin.toLocaleString() : ""}${job.salaryMin && job.salaryMax ? " - " : ""}${job.salaryMax ? job.salaryMax.toLocaleString() : ""} ${job.currency || "EUR"}`
    : undefined;

  // Generate content for each channel using AI
  const channels: AiChannel[] = ["tiktok", "instagram", "linkedin", "facebook", "whatsapp"];
  const generatedContents: GeneratedContentVariant[] = [];

  for (const channel of channels) {
    try {
      const aiContent = await generateContentWithAI({
        job: {
          title: job.title,
          location: job.location,
          contractType: job.contractType,
          sector: job.sector,
          salaryRange,
          description: job.description,
          profileRequirements: job.profile,
          benefits: job.benefits,
        },
        channel,
        tone,
        language,
        agencyName: job.agency.name,
        isDemo, // Pass demo flag to skip real AI calls
      });

      generatedContents.push({
        variant: CHANNEL_TO_VARIANT[channel],
        title: aiContent.title,
        body: aiContent.body,
        suggestedHashtags: aiContent.hashtags?.join(" "),
      });

      logInfo("AI content generated", { jobId, channel, tone, isDemo });
    } catch (error) {
      logError("AI generation failed for channel", {
        jobId,
        channel,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Fall back to template for this channel
      const templateContent = await generateSingleVariantTemplate(job, job.agency.name, channel, language);
      generatedContents.push(templateContent);
    }
  }

  // Upsert content records
  const contents = await Promise.all(
    generatedContents.map(async (variant) => {
      const existing = await db.jobPostContent.findFirst({
        where: { jobId, agencyId, variant: variant.variant },
      });

      if (existing) {
        return db.jobPostContent.update({
          where: { id: existing.id },
          data: {
            title: variant.title || null,
            body: variant.body,
            suggestedHashtags: variant.suggestedHashtags || null,
            language,
            status: "DRAFT",
            lastEditedById: userId || null,
            lastEditedAt: new Date(),
          },
        });
      } else {
        return db.jobPostContent.create({
          data: {
            jobId,
            agencyId,
            variant: variant.variant,
            title: variant.title || null,
            body: variant.body,
            suggestedHashtags: variant.suggestedHashtags || null,
            language,
            status: "DRAFT",
            createdById: userId || null,
            generatedAt: new Date(),
          },
        });
      }
    })
  );

  return { contents, usedAi: true };
}

/**
 * Regenerate a single content variant using AI.
 *
 * @param jobPostContentId - ID of the JobPostContent to regenerate
 * @param tone - Optional tone override
 * @param language - Optional language override
 * @param userId - User performing the regeneration
 * @returns Updated JobPostContent
 */
export async function regenerateSingleVariantWithAI(params: {
  jobPostContentId: string;
  tone?: AiTone;
  language?: string;
  userId?: string;
  agencySlug?: string;
}): Promise<{
  id: string;
  variant: ContentVariantType;
  title: string | null;
  body: string;
  suggestedHashtags: string | null;
}> {
  const { jobPostContentId, tone = "default", language, userId, agencySlug } = params;

  // Load existing content with job
  const content = await db.jobPostContent.findUnique({
    where: { id: jobPostContentId },
    include: {
      job: {
        include: {
          agency: { select: { name: true, slug: true } },
        },
      },
    },
  });

  if (!content) {
    throw new Error(`JobPostContent not found: ${jobPostContentId}`);
  }

  const job = content.job;
  const effectiveLanguage = language || content.language || "fr";
  const variant = content.variant as MainContentVariant;
  
  // GENERIC_SNIPPET is not supported for AI regeneration
  if (content.variant === "GENERIC_SNIPPET") {
    throw new Error("GENERIC_SNIPPET variant cannot be regenerated with AI");
  }
  
  const channel = VARIANT_TO_CHANNEL[variant];

  // Check if this is a demo agency
  const isDemo = isDemoAgency({ slug: agencySlug || job.agency.slug });

  // Check if AI is configured (demo mode can still proceed with stub content)
  if (!isAiConfigured() && !isDemo) {
    logInfo("AI not configured, falling back to template regeneration", { jobPostContentId });
    const templateContent = await generateSingleVariantTemplate(
      job,
      job.agency.name,
      channel,
      effectiveLanguage
    );

    const updated = await db.jobPostContent.update({
      where: { id: jobPostContentId },
      data: {
        title: templateContent.title || null,
        body: templateContent.body,
        suggestedHashtags: templateContent.suggestedHashtags || null,
        language: effectiveLanguage,
        status: "DRAFT",
        lastEditedById: userId || null,
        lastEditedAt: new Date(),
      },
    });

    return {
      id: updated.id,
      variant: updated.variant as ContentVariantType,
      title: updated.title,
      body: updated.body,
      suggestedHashtags: updated.suggestedHashtags,
    };
  }

  // Format salary for AI context
  const salaryRange = job.salaryMin || job.salaryMax
    ? `${job.salaryMin ? job.salaryMin.toLocaleString() : ""}${job.salaryMin && job.salaryMax ? " - " : ""}${job.salaryMax ? job.salaryMax.toLocaleString() : ""} ${job.currency || "EUR"}`
    : undefined;

  // Generate with AI
  const aiContent = await generateContentWithAI({
    job: {
      title: job.title,
      location: job.location,
      contractType: job.contractType,
      sector: job.sector,
      salaryRange,
      description: job.description,
      profileRequirements: job.profile,
      benefits: job.benefits,
    },
    channel,
    tone,
    language: effectiveLanguage,
    agencyName: job.agency.name,
    isDemo, // Pass demo flag to skip real AI calls
  });

  // Update content
  const updated = await db.jobPostContent.update({
    where: { id: jobPostContentId },
    data: {
      title: aiContent.title || null,
      body: aiContent.body,
      suggestedHashtags: aiContent.hashtags?.join(" ") || null,
      language: effectiveLanguage,
      status: "DRAFT",
      lastEditedById: userId || null,
      lastEditedAt: new Date(),
    },
  });

  logInfo("Single variant regenerated with AI", {
    jobPostContentId,
    variant: content.variant,
    tone,
  });

  return {
    id: updated.id,
    variant: updated.variant as ContentVariantType,
    title: updated.title,
    body: updated.body,
    suggestedHashtags: updated.suggestedHashtags,
  };
}

/**
 * Generate a single variant using templates (fallback when AI is not available)
 */
async function generateSingleVariantTemplate(
  job: {
    title: string;
    location: string | null;
    contractType: string | null;
    sector: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string | null;
    description: string;
    profile: string | null;
    benefits: string | null;
    tags: string[];
  },
  agencyName: string,
  channel: AiChannel,
  language: string
): Promise<GeneratedContentVariant> {
  const jobInput: JobInput = {
    id: "",
    title: job.title,
    location: job.location,
    contractType: job.contractType,
    sector: job.sector,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    currency: job.currency,
    description: job.description,
    profile: job.profile,
    benefits: job.benefits,
    tags: job.tags,
  };

  const agencyInput: AgencyInput = {
    id: "",
    name: agencyName,
    slug: "",
  };

  switch (channel) {
    case "tiktok":
      return generateTikTokScript(jobInput, agencyInput, language);
    case "instagram":
      return generateInstagramCaption(jobInput, agencyInput, language);
    case "linkedin":
      return generateLinkedInPost(jobInput, agencyInput, language);
    case "facebook":
      return generateFacebookPost(jobInput, agencyInput, language);
    case "whatsapp":
      return generateWhatsAppMessage(jobInput, agencyInput, language);
    default:
      return generateTikTokScript(jobInput, agencyInput, language);
  }
}
