"use client";

import { useState, useEffect, useRef } from "react";

interface ApplicationFormProps {
  jobId: string;
  jobTitle: string;
  agencyName: string;
  primaryColor: string;
  // Source tracking (from URL params)
  source?: string;
  sourceDetail?: string;
  channelId?: string;
}

type FormState = "idle" | "submitting" | "success" | "error";
type UploadState = "idle" | "uploading" | "success" | "error";

const STORAGE_KEY = "questhire_candidate_profile";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface StoredProfile {
  fullName: string;
  email: string;
  phone: string;
  cvUrl: string;
}

function loadStoredProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

function saveProfile(profile: StoredProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore localStorage errors
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ApplicationForm({
  jobId,
  jobTitle,
  agencyName,
  primaryColor,
  source: initialSource,
  sourceDetail,
  channelId,
}: ApplicationFormProps) {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [consent, setConsent] = useState(false);

  // File upload state
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load stored profile on mount
  useEffect(() => {
    const stored = loadStoredProfile();
    if (stored) {
      setFullName(stored.fullName || "");
      setEmail(stored.email || "");
      setPhone(stored.phone || "");
      setCvUrl(stored.cvUrl || "");
      setPrefilled(true);
    }
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setSelectedFile(file);

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setUploadError("Please upload a PDF or Word document");
      setSelectedFile(null);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
      setSelectedFile(null);
      return;
    }

    // Upload the file
    setUploadState("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("jobId", jobId);
      if (email) formData.append("email", email);

      const response = await fetch("/api/upload/cv", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      setCvUrl(data.url);
      setUploadedFileName(file.name);
      setUploadState("success");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploadState("error");
      setSelectedFile(null);
    }
  }

  function handleRemoveFile() {
    setCvUrl("");
    setSelectedFile(null);
    setUploadedFileName(null);
    setUploadState("idle");
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!consent) {
      setErrorMessage("Please accept the consent checkbox to continue.");
      return;
    }

    setFormState("submitting");
    setErrorMessage(null);

    try {
      // Determine source - use URL param if provided, otherwise default to "direct"
      const effectiveSource = initialSource || "direct";
      
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          fullName,
          email: email || undefined,
          phone: phone || undefined,
          cvUrl: cvUrl || undefined,
          source: effectiveSource,
          sourceDetail: sourceDetail || undefined,
          channelId: channelId || undefined,
          consentToContact: consent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit application");
      }

      // Save profile to localStorage for quick apply on future applications
      saveProfile({ fullName, email, phone, cvUrl });

      setFormState("success");
    } catch (err) {
      setFormState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  }

  if (formState === "success") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Application Submitted!
          </h3>
          <p className="text-slate-600 text-sm">
            Thank you for applying for <strong>{jobTitle}</strong> at{" "}
            <strong>{agencyName}</strong>.
          </p>
          <p className="text-slate-500 text-sm mt-2">
            We&apos;ll review your application and get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Apply for this position
      </h3>

      {prefilled && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg">
          ✨ We&apos;ve prefilled your details from a previous application.
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="John Doe"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="john@example.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="+33 6 12 34 56 78"
          />
        </div>

        {/* CV Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            CV / Resume
          </label>
          
          {uploadState === "success" && uploadedFileName ? (
            // Show uploaded file
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1 text-sm text-green-800 truncate">{uploadedFileName}</span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-green-600 hover:text-green-800 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          ) : uploadState === "uploading" ? (
            // Show uploading state
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-blue-800">Uploading...</span>
            </div>
          ) : (
            // Show file input
            <div>
              <input
                ref={fileInputRef}
                type="file"
                id="cvFile"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="cvFile"
                className="flex items-center justify-center gap-2 w-full px-3 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-slate-50 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-sm text-slate-600">
                  Click to upload CV (PDF, DOC, DOCX)
                </span>
              </label>
            </div>
          )}
          
          {uploadError && (
            <p className="text-xs text-red-600 mt-1">{uploadError}</p>
          )}
          
          <p className="text-xs text-slate-500 mt-1">
            Max file size: 5 MB. Or paste a link below.
          </p>
          
          {/* Fallback URL input */}
          {uploadState !== "success" && (
            <input
              type="url"
              value={cvUrl}
              onChange={(e) => setCvUrl(e.target.value)}
              className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Or paste a link to your CV..."
            />
          )}
        </div>

        {/* Consent */}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="consent" className="text-sm text-slate-600">
            I agree to be contacted regarding job opportunities and understand
            my data will be processed according to the privacy policy.{" "}
            <span className="text-red-500">*</span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={formState === "submitting"}
          className="w-full py-3 px-4 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: primaryColor }}
        >
          {formState === "submitting" ? "Submitting..." : "Submit Application"}
        </button>
      </form>

      <p className="text-xs text-slate-500 text-center mt-4">
        Your data is handled securely and will only be used for recruitment
        purposes.
      </p>
      <p className="text-xs text-slate-400 text-center mt-2">
        We may reuse your profile details for future applications with this
        agency, always respecting your consent.
      </p>
    </div>
  );
}
