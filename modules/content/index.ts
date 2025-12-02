/**
 * Content Module
 *
 * Provides social content generation and management utilities.
 * Supports both template-based and AI-powered generation.
 */

export {
  // Template-based generation
  generateSocialPackForJob,
  getVariantLabel,
  getVariantIcon,
  // AI-powered generation
  generateJobContentPackWithAI,
  regenerateSingleVariantWithAI,
  // Types
  type GeneratedContentVariant,
  type ContentVariantType,
  type JobInput,
  type AgencyInput,
  type GenerateParams,
  type GenerateWithAiParams,
  type GeneratedPackResult,
} from "./generator";
