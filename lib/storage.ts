/**
 * S3-compatible storage client for file uploads
 * 
 * Supports AWS S3, Cloudflare R2, MinIO, etc.
 * Configure via environment variables.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { ENV } from "@/lib/env";
import { logInfo, logError } from "@/lib/log";
import { randomUUID } from "crypto";

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_CV_CONTENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/rtf",
  "text/plain",
];

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/rtf": ".rtf",
  "text/plain": ".txt",
};

// =============================================================================
// ERRORS
// =============================================================================

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

export class FileTooLargeError extends StorageError {
  constructor(size: number, maxSize: number) {
    super(`File size ${(size / 1024 / 1024).toFixed(2)} MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(0)} MB`);
    this.name = "FileTooLargeError";
  }
}

export class InvalidContentTypeError extends StorageError {
  constructor(contentType: string) {
    super(`Content type "${contentType}" is not allowed. Allowed types: PDF, DOC, DOCX, RTF, TXT`);
    this.name = "InvalidContentTypeError";
  }
}

export class StorageNotConfiguredError extends StorageError {
  constructor() {
    super("Storage is not configured. Please set STORAGE_BUCKET and credentials in environment variables.");
    this.name = "StorageNotConfiguredError";
  }
}

// =============================================================================
// S3 CLIENT
// =============================================================================

function getS3Client(): S3Client {
  if (!ENV.STORAGE_BUCKET || !ENV.STORAGE_ACCESS_KEY_ID || !ENV.STORAGE_SECRET_ACCESS_KEY) {
    throw new StorageNotConfiguredError();
  }

  const config: ConstructorParameters<typeof S3Client>[0] = {
    region: ENV.STORAGE_REGION || "auto",
    credentials: {
      accessKeyId: ENV.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: ENV.STORAGE_SECRET_ACCESS_KEY,
    },
  };

  // Custom endpoint for S3-compatible services (R2, MinIO, etc.)
  if (ENV.STORAGE_ENDPOINT) {
    config.endpoint = ENV.STORAGE_ENDPOINT;
    config.forcePathStyle = true; // Required for some S3-compatible services
  }

  return new S3Client(config);
}

// Lazy-loaded client
let _s3Client: S3Client | null = null;
function getClient(): S3Client {
  if (!_s3Client) {
    _s3Client = getS3Client();
  }
  return _s3Client;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Sanitize filename for safe storage
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

/**
 * Generate storage key for CV files
 */
function generateCvKey(agencyId: string, fileName: string, contentType: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const uuid = randomUUID().slice(0, 8);
  const sanitized = sanitizeFileName(fileName);
  const ext = CONTENT_TYPE_EXTENSIONS[contentType] || "";
  
  // Ensure filename has correct extension
  const finalName = sanitized.endsWith(ext) ? sanitized : `${sanitized}${ext}`;
  
  return `cvs/${agencyId}/${year}/${month}/${uuid}-${finalName}`;
}

/**
 * Build public URL for a storage key
 */
function buildPublicUrl(key: string): string {
  if (ENV.STORAGE_PUBLIC_BASE_URL) {
    const baseUrl = ENV.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "");
    return `${baseUrl}/${key}`;
  }
  
  // Fallback: construct S3 URL
  if (ENV.STORAGE_ENDPOINT) {
    return `${ENV.STORAGE_ENDPOINT}/${ENV.STORAGE_BUCKET}/${key}`;
  }
  
  return `https://${ENV.STORAGE_BUCKET}.s3.${ENV.STORAGE_REGION}.amazonaws.com/${key}`;
}

// =============================================================================
// PUBLIC API
// =============================================================================

export interface UploadCvParams {
  agencyId: string;
  candidateEmail?: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}

export interface UploadCvResult {
  url: string;
  key: string;
}

/**
 * Upload a CV file to storage
 */
export async function uploadCvFile(params: UploadCvParams): Promise<UploadCvResult> {
  const { agencyId, fileName, contentType, buffer } = params;

  // Validate content type
  if (!ALLOWED_CV_CONTENT_TYPES.includes(contentType)) {
    throw new InvalidContentTypeError(contentType);
  }

  // Validate file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new FileTooLargeError(buffer.length, MAX_FILE_SIZE);
  }

  // Generate storage key
  const key = generateCvKey(agencyId, fileName, contentType);

  logInfo("Uploading CV file", {
    agencyId,
    fileName,
    contentType,
    size: buffer.length,
    key,
  });

  try {
    const client = getClient();

    await client.send(
      new PutObjectCommand({
        Bucket: ENV.STORAGE_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          agencyId,
          originalFileName: fileName,
        },
      })
    );

    const url = buildPublicUrl(key);

    logInfo("CV file uploaded successfully", { key, url });

    return { url, key };
  } catch (error) {
    logError("Failed to upload CV file", {
      error: error instanceof Error ? error.message : "Unknown error",
      key,
    });
    throw new StorageError("Failed to upload file. Please try again.");
  }
}

/**
 * Check if storage is configured
 */
export function isStorageConfigured(): boolean {
  return !!(ENV.STORAGE_BUCKET && ENV.STORAGE_ACCESS_KEY_ID && ENV.STORAGE_SECRET_ACCESS_KEY);
}

/**
 * Get allowed content types for CV uploads
 */
export function getAllowedCvContentTypes(): string[] {
  return [...ALLOWED_CV_CONTENT_TYPES];
}

/**
 * Get max file size in bytes
 */
export function getMaxFileSize(): number {
  return MAX_FILE_SIZE;
}
