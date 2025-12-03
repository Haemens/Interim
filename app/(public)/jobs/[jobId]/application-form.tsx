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
  availabilityDate?: string;
  mobilityRadius?: string;
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
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [mobilityRadius, setMobilityRadius] = useState("");
  const [consent, setConsent] = useState(false);

  // File upload state
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"express" | "account">("express");

  // Load stored profile on mount
  useEffect(() => {
    const stored = loadStoredProfile();
    if (stored) {
      setFullName(stored.fullName || "");
      setEmail(stored.email || "");
      setPhone(stored.phone || "");
      setCvUrl(stored.cvUrl || "");
      setAvailabilityDate(stored.availabilityDate || "");
      setMobilityRadius(stored.mobilityRadius || "");
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
      setUploadError("Veuillez télécharger un fichier PDF ou Word");
      setSelectedFile(null);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`Fichier trop volumineux. Taille maximum : ${formatFileSize(MAX_FILE_SIZE)}`);
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
        throw new Error(data.error || "Échec du téléchargement");
      }

      setCvUrl(data.url);
      setUploadedFileName(file.name);
      setUploadState("success");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Échec du téléchargement");
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
      setErrorMessage("Veuillez accepter les conditions pour continuer.");
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
          availabilityDate: availabilityDate || undefined,
          mobilityRadius: mobilityRadius ? parseInt(mobilityRadius) : undefined,
          source: effectiveSource,
          sourceDetail: sourceDetail || undefined,
          channelId: channelId || undefined,
          consentToContact: consent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Échec de l'envoi de la candidature");
      }

      // Save profile to localStorage for quick apply on future applications
      saveProfile({ fullName, email, phone, cvUrl, availabilityDate, mobilityRadius });

      setFormState("success");
    } catch (err) {
      setFormState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Une erreur est survenue"
      );
    }
  }

  if (formState === "success") {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
          🎉
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Candidature envoyée !
        </h3>
        <p className="text-slate-600 mb-6">
          Merci pour votre candidature au poste de <strong>{jobTitle}</strong>.
        </p>
        <p className="text-sm text-slate-500">
          Un email de confirmation vous a été envoyé.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("express")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === "express"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Candidature Express
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === "account"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          J&apos;ai un compte
        </button>
      </div>

      {activeTab === "account" ? (
        <div className="text-center py-8 px-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h4 className="font-semibold text-slate-900 mb-2">Connectez-vous pour postuler</h4>
          <p className="text-sm text-slate-600 mb-6">
            Retrouvez vos informations pré-remplies et suivez vos candidatures.
          </p>
          <a 
            href="/login?role=candidate" 
            className="block w-full py-2.5 px-4 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            Se connecter
          </a>
          <button 
            onClick={() => setActiveTab("express")}
            className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Continuer sans compte &rarr;
          </button>
        </div>
      ) : (
        <>
          {prefilled && (
            <div className="mb-6 p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm rounded-lg flex items-start gap-2">
              <span className="text-lg">✨</span>
              <div>
                <p className="font-medium">Informations pré-remplies</p>
                <p className="text-xs opacity-80 mt-0.5">Basé sur votre dernière visite.</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Nom complet <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Jean Dupont"
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
            placeholder="jean@exemple.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Téléphone
          </label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="06 12 34 56 78"
          />
        </div>

        {/* Availability & Mobility */}
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="availability" className="block text-sm font-medium text-slate-700 mb-1">
                    Disponibilité
                </label>
                <input
                    type="date"
                    id="availability"
                    value={availabilityDate}
                    onChange={(e) => setAvailabilityDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
            </div>
            <div>
                <label htmlFor="mobility" className="block text-sm font-medium text-slate-700 mb-1">
                    Mobilité (km)
                </label>
                <input
                    type="number"
                    id="mobility"
                    value={mobilityRadius}
                    onChange={(e) => setMobilityRadius(e.target.value)}
                    placeholder="20"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
            </div>
        </div>

        {/* CV Upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            CV
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
                Supprimer
              </button>
            </div>
          ) : uploadState === "uploading" ? (
            // Show uploading state
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-blue-800">Téléchargement...</span>
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
                  Cliquez pour télécharger votre CV (PDF, DOC, DOCX)
                </span>
              </label>
            </div>
          )}
          
          {uploadError && (
            <p className="text-xs text-red-600 mt-1">{uploadError}</p>
          )}
          
          <p className="text-xs text-slate-500 mt-1">
            Taille max : 5 Mo. Ou collez un lien ci-dessous.
          </p>
          
          {/* Fallback URL input */}
          {uploadState !== "success" && (
            <input
              type="url"
              value={cvUrl}
              onChange={(e) => setCvUrl(e.target.value)}
              className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Ou collez un lien vers votre CV..."
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
            J&apos;accepte d&apos;être contacté(e) concernant des opportunités d&apos;emploi et 
            je comprends que mes données seront traitées conformément à la politique de confidentialité.{" "}
            <span className="text-red-500">*</span>
          </label>
        </div>

        {/* Submit */}
        <div className="pt-2">
            <button
              type="submit"
              disabled={formState === "submitting"}
              className="w-full py-3 px-4 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{ backgroundColor: primaryColor }}
            >
              {formState === "submitting" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Envoi en cours...
                </span>
              ) : (
                "Envoyer ma candidature"
              )}
            </button>
          </div>
        </form>
        </>
      )}

      <div className="mt-6 pt-6 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center leading-relaxed">
          Vos données sont traitées de manière sécurisée et utilisées uniquement à des fins de recrutement.
        </p>
      </div>
    </div>
  );
}
