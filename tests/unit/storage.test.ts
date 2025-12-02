import { describe, it, expect, vi } from "vitest";

// Mock the log module to avoid db dependency
vi.mock("@/lib/log", () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import {
  FileTooLargeError,
  InvalidContentTypeError,
  StorageNotConfiguredError,
  getAllowedCvContentTypes,
  getMaxFileSize,
  isStorageConfigured,
} from "@/lib/storage";

describe("Storage Utilities", () => {
  describe("Error classes", () => {
    it("FileTooLargeError should format message correctly", () => {
      const error = new FileTooLargeError(10 * 1024 * 1024, 5 * 1024 * 1024);

      expect(error.name).toBe("FileTooLargeError");
      expect(error.message).toContain("10.00 MB");
      expect(error.message).toContain("5 MB");
    });

    it("InvalidContentTypeError should list allowed types", () => {
      const error = new InvalidContentTypeError("image/png");

      expect(error.name).toBe("InvalidContentTypeError");
      expect(error.message).toContain("image/png");
      expect(error.message).toContain("PDF");
    });

    it("StorageNotConfiguredError should have helpful message", () => {
      const error = new StorageNotConfiguredError();

      expect(error.name).toBe("StorageNotConfiguredError");
      expect(error.message).toContain("STORAGE_BUCKET");
    });
  });

  describe("getAllowedCvContentTypes", () => {
    it("should include PDF", () => {
      const types = getAllowedCvContentTypes();
      expect(types).toContain("application/pdf");
    });

    it("should include Word documents", () => {
      const types = getAllowedCvContentTypes();
      expect(types).toContain("application/msword");
      expect(types).toContain(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    });

    it("should return a copy (not mutate original)", () => {
      const types1 = getAllowedCvContentTypes();
      const types2 = getAllowedCvContentTypes();

      types1.push("test");
      expect(types2).not.toContain("test");
    });
  });

  describe("getMaxFileSize", () => {
    it("should return 5 MB in bytes", () => {
      const maxSize = getMaxFileSize();
      expect(maxSize).toBe(5 * 1024 * 1024);
    });
  });

  describe("isStorageConfigured", () => {
    it("should return false when env vars not set", () => {
      // In test environment, storage vars are not set
      expect(isStorageConfigured()).toBe(false);
    });
  });
});
