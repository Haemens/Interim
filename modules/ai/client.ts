/**
 * AI Client Abstraction
 *
 * Provides a unified interface for AI content generation using OpenAI or Anthropic.
 * Supports multiple tones, audiences, and channels for social content generation.
 */

import { ENV, FEATURES } from "@/lib/env";
import { logInfo, logError, logWarn } from "@/lib/log";
import { isDemoAgency } from "@/modules/auth/demo-mode";

// =============================================================================
// TYPES
// =============================================================================

export type AiTone = "default" | "friendly" | "formal" | "punchy";
export type AiAudience = "candidates" | "clients";
export type AiChannel = "tiktok" | "instagram" | "linkedin" | "whatsapp";

export interface JobContext {
  title: string;
  location?: string | null;
  contractType?: string | null;
  sector?: string | null;
  salaryRange?: string | null;
  description?: string | null;
  profileRequirements?: string | null;
  benefits?: string | null;
}

export interface GenerateContentParams {
  job: JobContext;
  channel: AiChannel;
  tone?: AiTone;
  audience?: AiAudience;
  language?: string; // "fr", "en", "es", "de"
  maxTokens?: number;
  agencyName?: string;
  /** If true, skip real AI call and return demo content */
  isDemo?: boolean;
}

export interface GeneratedContent {
  title?: string;
  body: string;
  hashtags?: string[];
}

// =============================================================================
// ERRORS
// =============================================================================

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI provider is not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in environment.");
    this.name = "AiNotConfiguredError";
  }
}

export class AiGenerationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AiGenerationError";
  }
}

// =============================================================================
// PROMPT TEMPLATES
// =============================================================================

const CHANNEL_GUIDELINES: Record<AiChannel, { instructions: string; maxTokens: number; temperature: number }> = {
  tiktok: {
    instructions: `TikTok Script Guidelines:
- Start with a STRONG HOOK in the first line (this is crucial - first 3 seconds matter)
- Keep it under 150 words total
- Use casual, energetic, spoken language (imagine someone reading this aloud)
- Include 1-2 emojis maximum
- End with a clear call-to-action ("Link in bio", "DM us", "Postulez maintenant")
- Format: Hook → Key info → Benefits → CTA
- Make it feel authentic and human, not corporate`,
    maxTokens: 400,
    temperature: 0.85, // More creative for TikTok
  },

  instagram: {
    instructions: `Instagram Caption Guidelines:
- Start with an attention-grabbing first line (hook)
- Use line breaks for readability
- Include 3-5 relevant emojis throughout the text
- Use bullet points (•) for benefits/requirements
- Keep under 300 words
- End with a clear CTA
- Suggest 5-8 relevant hashtags at the end`,
    maxTokens: 600,
    temperature: 0.75,
  },

  linkedin: {
    instructions: `LinkedIn Post Guidelines:
- Professional but engaging tone
- Start with a compelling hook question or statement
- Use **bold** for emphasis on key points
- Structure with 2-3 short paragraphs
- Include specific details (salary range, location, key benefits)
- Keep under 400 words
- End with a networking-friendly CTA ("Interested? Let's connect", "Know someone perfect for this role?")
- Add 3-5 professional hashtags`,
    maxTokens: 700,
    temperature: 0.65, // More structured for LinkedIn
  },

  whatsapp: {
    instructions: `WhatsApp Message Guidelines:
- Keep it SHORT and personal (under 100 words)
- Use *asterisks* for bold text on key info
- Be direct and conversational (one-to-one style)
- Include only: job title, location, salary range, 1-2 key benefits
- End with a simple response prompt ("Intéressé(e) ? Réponds-moi !")
- NO hashtags for WhatsApp`,
    maxTokens: 300,
    temperature: 0.7,
  },
};

const TONE_MODIFIERS: Record<AiTone, { fr: string; en: string }> = {
  default: {
    fr: "Utilise un ton équilibré, professionnel mais accessible. Sois engageant sans être trop familier.",
    en: "Use a balanced, professional yet approachable tone. Be engaging without being too casual.",
  },
  friendly: {
    fr: "Utilise un ton chaleureux, enthousiaste et conversationnel. Sois encourageant et positif. Tutoie le lecteur.",
    en: "Use a warm, enthusiastic, and conversational tone. Be encouraging and positive. Address the reader directly.",
  },
  formal: {
    fr: "Utilise un ton formel et professionnel. Sois précis et orienté business. Vouvoie le lecteur.",
    en: "Use a formal, professional tone. Be precise and business-like. Maintain professional distance.",
  },
  punchy: {
    fr: "Utilise des phrases courtes et percutantes. Sois audacieux et accrocheur. Utilise des mots forts et des verbes d'action.",
    en: "Use short, impactful sentences. Be bold and attention-grabbing. Use power words and action verbs.",
  },
};

const LANGUAGE_INSTRUCTIONS: Record<string, { systemPrompt: string; outputLanguage: string }> = {
  fr: {
    systemPrompt: "Tu es un expert en création de contenu pour les réseaux sociaux, spécialisé dans le recrutement. Tu écris du contenu engageant qui attire les candidats.",
    outputLanguage: "Écris le contenu ENTIÈREMENT en français. Utilise un français naturel et moderne.",
  },
  en: {
    systemPrompt: "You are an expert social media content creator specialized in recruitment. You write engaging content that attracts candidates.",
    outputLanguage: "Write the content ENTIRELY in English. Use natural, modern English.",
  },
  es: {
    systemPrompt: "Eres un experto en creación de contenido para redes sociales, especializado en reclutamiento.",
    outputLanguage: "Escribe el contenido COMPLETAMENTE en español. Usa un español natural y moderno.",
  },
  de: {
    systemPrompt: "Du bist ein Experte für Social-Media-Content-Erstellung, spezialisiert auf Recruiting.",
    outputLanguage: "Schreibe den Inhalt VOLLSTÄNDIG auf Deutsch. Verwende natürliches, modernes Deutsch.",
  },
};

interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
}

function buildPrompt(params: GenerateContentParams): BuiltPrompt {
  const { job, channel, tone = "default", audience = "candidates", language = "fr", agencyName } = params;

  const channelConfig = CHANNEL_GUIDELINES[channel];
  const langConfig = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr;
  const toneConfig = TONE_MODIFIERS[tone];
  const toneInstruction = language === "en" ? toneConfig.en : toneConfig.fr;

  const audienceContext = language === "fr"
    ? (audience === "candidates"
      ? "Tu écris pour attirer des candidats à postuler."
      : "Tu écris pour informer des clients sur les talents disponibles.")
    : (audience === "candidates"
      ? "You are writing to attract job candidates to apply."
      : "You are writing to inform clients about available talent.");

  // Build job details section
  const jobDetails: string[] = [];
  jobDetails.push(`**Titre du poste / Job Title:** ${job.title}`);
  if (job.location) jobDetails.push(`**Localisation / Location:** ${job.location}`);
  if (job.contractType) jobDetails.push(`**Type de contrat / Contract:** ${job.contractType}`);
  if (job.sector) jobDetails.push(`**Secteur / Sector:** ${job.sector}`);
  if (job.salaryRange) jobDetails.push(`**Salaire / Salary:** ${job.salaryRange}`);
  if (job.description) {
    const desc = job.description.slice(0, 600);
    jobDetails.push(`\n**Description:**\n${desc}${job.description.length > 600 ? "..." : ""}`);
  }
  if (job.profileRequirements) {
    const req = job.profileRequirements.slice(0, 400);
    jobDetails.push(`\n**Profil recherché / Requirements:**\n${req}${job.profileRequirements.length > 400 ? "..." : ""}`);
  }
  if (job.benefits) {
    const ben = job.benefits.slice(0, 300);
    jobDetails.push(`\n**Avantages / Benefits:**\n${ben}${job.benefits.length > 300 ? "..." : ""}`);
  }

  const hashtagInstruction = channel === "whatsapp"
    ? "Do NOT include hashtags for WhatsApp."
    : channel === "tiktok"
    ? "Include 3-5 relevant hashtags."
    : channel === "instagram"
    ? "Include 5-8 relevant hashtags."
    : "Include 3-5 professional hashtags.";

  const userPrompt = `${audienceContext}
${toneInstruction}
${langConfig.outputLanguage}

---

**CHANNEL GUIDELINES:**
${channelConfig.instructions}

---

**JOB POSTING DETAILS:**
${jobDetails.join("\n")}

${agencyName ? `**Agency:** ${agencyName}` : ""}

---

**OUTPUT FORMAT:**
Respond with a valid JSON object ONLY (no markdown, no explanation):
{
  "title": "Optional short title for the content (can be null)",
  "body": "The main content text",
  "hashtags": ["array", "of", "hashtags", "without", "#", "symbol"]
}

${hashtagInstruction}`;

  return {
    systemPrompt: langConfig.systemPrompt,
    userPrompt,
    maxTokens: channelConfig.maxTokens,
    temperature: channelConfig.temperature,
  };
}

// =============================================================================
// AI PROVIDERS
// =============================================================================

interface AiCallParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature: number;
}

async function callOpenAI(params: AiCallParams): Promise<string> {
  const apiKey = ENV.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiNotConfiguredError();
  }

  const model = ENV.OPENAI_MODEL || "gpt-4o";

  logInfo("Calling OpenAI", { model, maxTokens: params.maxTokens, temperature: params.temperature });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logError("OpenAI API error", { status: response.status, error: error.slice(0, 500) });
    throw new AiGenerationError(`OpenAI API error: ${response.status} - ${error.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";
  
  logInfo("OpenAI response received", { 
    model, 
    promptTokens: data.usage?.prompt_tokens,
    completionTokens: data.usage?.completion_tokens,
  });

  return content;
}

async function callAnthropic(params: AiCallParams): Promise<string> {
  const apiKey = ENV.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiNotConfiguredError();
  }

  const model = ENV.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  logInfo("Calling Anthropic", { model, maxTokens: params.maxTokens, temperature: params.temperature });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      messages: [{ role: "user", content: params.userPrompt }],
      system: params.systemPrompt + " Always respond with valid JSON only, no additional text or markdown.",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logError("Anthropic API error", { status: response.status, error: error.slice(0, 500) });
    throw new AiGenerationError(`Anthropic API error: ${response.status} - ${error.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.content?.[0];
  
  logInfo("Anthropic response received", {
    model,
    inputTokens: data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
  });

  return content?.type === "text" ? content.text : "";
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

// =============================================================================
// DEMO MODE CONTENT
// =============================================================================

const DEMO_CONTENT: Record<AiChannel, Record<string, GeneratedContent>> = {
  tiktok: {
    fr: {
      title: "Script TikTok (Démo)",
      body: `🎬 STOP ! Tu cherches un nouveau job ?

On recrute un(e) {{jobTitle}} à {{location}} !

✅ Salaire attractif
✅ Équipe au top
✅ Évolution garantie

👉 Lien en bio pour postuler !

#recrutement #emploi #job`,
      hashtags: ["recrutement", "emploi", "job", "carriere", "opportunite"],
    },
    en: {
      title: "TikTok Script (Demo)",
      body: `🎬 WAIT! Looking for a new job?

We're hiring a {{jobTitle}} in {{location}}!

✅ Great salary
✅ Amazing team
✅ Career growth

👉 Link in bio to apply!

#hiring #jobs #career`,
      hashtags: ["hiring", "jobs", "career", "opportunity", "work"],
    },
  },
  instagram: {
    fr: {
      title: "Caption Instagram (Démo)",
      body: `🚀 Nouvelle opportunité !

Nous recherchons un(e) **{{jobTitle}}** pour rejoindre notre équipe à {{location}}.

📍 Localisation : {{location}}
💼 Contrat : {{contractType}}
💰 Rémunération attractive

Ce qu'on t'offre :
• Une équipe dynamique
• Des projets stimulants
• De vraies perspectives d'évolution

Intéressé(e) ? Postule maintenant ! 👇
Lien en bio

#recrutement #emploi #job #carriere #opportunite #hiring`,
      hashtags: ["recrutement", "emploi", "job", "carriere", "opportunite", "hiring", "travail", "france"],
    },
    en: {
      title: "Instagram Caption (Demo)",
      body: `🚀 New opportunity!

We're looking for a **{{jobTitle}}** to join our team in {{location}}.

📍 Location: {{location}}
💼 Contract: {{contractType}}
💰 Competitive salary

What we offer:
• Dynamic team
• Exciting projects
• Real growth opportunities

Interested? Apply now! 👇
Link in bio

#hiring #jobs #career #opportunity #work #recruitment`,
      hashtags: ["hiring", "jobs", "career", "opportunity", "work", "recruitment", "employment", "jobalert"],
    },
  },
  linkedin: {
    fr: {
      title: "Post LinkedIn (Démo)",
      body: `**Nous recrutons !** 🎯

Notre équipe s'agrandit et nous recherchons un(e) **{{jobTitle}}** pour nous rejoindre à {{location}}.

**Le poste :**
Vous intégrerez une équipe dynamique avec des projets stimulants et de réelles opportunités d'évolution.

**Ce que nous offrons :**
• Rémunération attractive
• Environnement de travail moderne
• Formation continue

**Profil recherché :**
Vous êtes motivé(e), rigoureux(se) et avez envie de relever de nouveaux défis.

Intéressé(e) ? Envoyez-nous votre candidature ou partagez cette offre avec votre réseau !

#recrutement #emploi #opportunité`,
      hashtags: ["recrutement", "emploi", "opportunité", "carrière", "hiring"],
    },
    en: {
      title: "LinkedIn Post (Demo)",
      body: `**We're hiring!** 🎯

Our team is growing and we're looking for a **{{jobTitle}}** to join us in {{location}}.

**The role:**
You'll join a dynamic team with exciting projects and real growth opportunities.

**What we offer:**
• Competitive salary
• Modern work environment
• Continuous training

**Who we're looking for:**
You're motivated, detail-oriented, and ready for new challenges.

Interested? Send us your application or share this post with your network!

#hiring #jobs #opportunity`,
      hashtags: ["hiring", "jobs", "opportunity", "career", "recruitment"],
    },
  },
  whatsapp: {
    fr: {
      body: `Salut ! 👋

On recrute un(e) *{{jobTitle}}* à *{{location}}*.

💰 Salaire attractif
📍 {{location}}

Intéressé(e) ? Réponds-moi pour plus d'infos !`,
    },
    en: {
      body: `Hi! 👋

We're hiring a *{{jobTitle}}* in *{{location}}*.

💰 Great salary
📍 {{location}}

Interested? Reply for more info!`,
    },
  },
};

/**
 * Generate demo content (no real AI call)
 */
function generateDemoContent(params: GenerateContentParams): GeneratedContent {
  const { job, channel, language = "fr" } = params;
  const lang = language === "en" ? "en" : "fr"; // Default to French for other languages
  
  const template = DEMO_CONTENT[channel]?.[lang] || DEMO_CONTENT[channel]?.fr;
  if (!template) {
    return {
      title: `Demo ${channel} content`,
      body: `[DEMO] Content for ${job.title} - ${channel}`,
      hashtags: ["demo", "test"],
    };
  }

  // Replace placeholders
  let body = template.body
    .replace(/\{\{jobTitle\}\}/g, job.title)
    .replace(/\{\{location\}\}/g, job.location || "France")
    .replace(/\{\{contractType\}\}/g, job.contractType || "CDI");

  let title = template.title
    ?.replace(/\{\{jobTitle\}\}/g, job.title)
    .replace(/\{\{location\}\}/g, job.location || "France");

  logInfo("Generated demo AI content", { channel, language: lang, jobTitle: job.title });

  return {
    title,
    body,
    hashtags: template.hashtags,
  };
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate social content using AI.
 *
 * Uses OpenAI or Anthropic based on configuration.
 * In demo mode, returns deterministic stub content without calling real APIs.
 *
 * @param params - Generation parameters including job context, channel, tone, etc.
 * @returns Generated content with title, body, and hashtags
 * @throws AiNotConfiguredError if no AI provider is configured (and not in demo mode)
 * @throws AiGenerationError if the AI call fails
 */
export async function generateContentWithAI(params: GenerateContentParams): Promise<GeneratedContent> {
  // Demo mode: return stub content without calling real AI
  if (params.isDemo) {
    logInfo("AI generation in demo mode - returning stub content", {
      channel: params.channel,
      jobTitle: params.job.title,
    });
    return generateDemoContent(params);
  }

  // Check if AI is configured
  if (!FEATURES.ai) {
    logWarn("AI generation requested but no AI provider configured");
    throw new AiNotConfiguredError();
  }

  const promptData = buildPrompt(params);

  logInfo("Generating AI content", {
    channel: params.channel,
    tone: params.tone,
    language: params.language,
    provider: ENV.AI_PROVIDER,
    maxTokens: promptData.maxTokens,
    temperature: promptData.temperature,
  });

  let rawResponse: string;

  try {
    // Use configured provider
    if (ENV.AI_PROVIDER === "anthropic" && ENV.ANTHROPIC_API_KEY) {
      rawResponse = await callAnthropic(promptData);
    } else if (ENV.OPENAI_API_KEY) {
      rawResponse = await callOpenAI(promptData);
    } else if (ENV.ANTHROPIC_API_KEY) {
      rawResponse = await callAnthropic(promptData);
    } else {
      throw new AiNotConfiguredError();
    }
  } catch (error) {
    if (error instanceof AiNotConfiguredError || error instanceof AiGenerationError) {
      throw error;
    }
    logError("AI generation failed", { error: error instanceof Error ? error.message : "Unknown error" });
    throw new AiGenerationError("Failed to generate content", error);
  }

  // Parse JSON response
  try {
    // Clean up response - remove markdown code blocks if present
    let cleanResponse = rawResponse.trim();
    if (cleanResponse.startsWith("```json")) {
      cleanResponse = cleanResponse.slice(7);
    }
    if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse.slice(3);
    }
    if (cleanResponse.endsWith("```")) {
      cleanResponse = cleanResponse.slice(0, -3);
    }
    cleanResponse = cleanResponse.trim();

    const parsed = JSON.parse(cleanResponse);

    // Normalize hashtags (remove # if present)
    let hashtags = parsed.hashtags;
    if (Array.isArray(hashtags)) {
      hashtags = hashtags.map((h: string) => h.replace(/^#/, ""));
    }

    logInfo("AI content generated successfully", {
      channel: params.channel,
      hasTitle: !!parsed.title,
      bodyLength: parsed.body?.length || 0,
      hashtagCount: hashtags?.length || 0,
    });

    return {
      title: parsed.title || undefined,
      body: parsed.body || "",
      hashtags,
    };
  } catch (parseError) {
    logError("Failed to parse AI response", { rawResponse: rawResponse.slice(0, 500) });
    // If parsing fails, try to extract content directly
    return {
      body: rawResponse,
      hashtags: undefined,
    };
  }
}

/**
 * Check if AI generation is available.
 * @returns true if an AI provider is configured
 */
export function isAiConfigured(): boolean {
  return FEATURES.ai;
}
