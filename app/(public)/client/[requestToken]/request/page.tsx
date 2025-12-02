"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

// =============================================================================
// TYPES
// =============================================================================

interface ClientInfo {
  client: {
    id: string;
    name: string;
    companyName: string | null;
  };
  agency: {
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
  };
}

// =============================================================================
// CONTRACT TYPE OPTIONS
// =============================================================================

const CONTRACT_TYPES = [
  { value: "", label: "Select contract type..." },
  { value: "CDI", label: "CDI (Permanent)" },
  { value: "CDD", label: "CDD (Fixed-term)" },
  { value: "Interim", label: "Interim (Temporary)" },
  { value: "Freelance", label: "Freelance" },
  { value: "Apprenticeship", label: "Apprenticeship" },
  { value: "Internship", label: "Internship" },
  { value: "Other", label: "Other" },
];

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function ClientJobRequestPage() {
  const params = useParams();
  const requestToken = params.requestToken as string;

  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    contractType: "",
    salaryRange: "",
    description: "",
    requirements: "",
    startDate: "",
    notes: "",
  });

  // Fetch client info on mount
  useEffect(() => {
    async function fetchClientInfo() {
      try {
        const res = await fetch(`/api/client/${requestToken}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("This request link is invalid or has expired.");
          } else {
            setError("Failed to load request form. Please try again.");
          }
          return;
        }
        const data = await res.json();
        setClientInfo(data);
      } catch {
        setError("Failed to load request form. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (requestToken) {
      fetchClientInfo();
    }
  }, [requestToken]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/client/${requestToken}/job-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          location: formData.location || undefined,
          contractType: formData.contractType || undefined,
          salaryRange: formData.salaryRange || undefined,
          description: formData.description || undefined,
          requirements: formData.requirements || undefined,
          startDate: formData.startDate || undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state (invalid token)
  if (error && !clientInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Link</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!clientInfo) return null;

  const primaryColor = clientInfo.agency.primaryColor || "#4F46E5";

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: primaryColor + "20" }}
          >
            <svg className="w-8 h-8" style={{ color: primaryColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Request Submitted!</h1>
          <p className="text-slate-600">
            Thank you! Your job request has been sent to {clientInfo.agency.name}.
            They will review it and get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="py-8 px-4" style={{ backgroundColor: primaryColor }}>
        <div className="max-w-2xl mx-auto text-center text-white">
          {clientInfo.agency.logoUrl && (
            <img
              src={clientInfo.agency.logoUrl}
              alt={clientInfo.agency.name}
              className="h-12 mx-auto mb-4"
            />
          )}
          <h1 className="text-2xl font-bold">{clientInfo.agency.name}</h1>
          <p className="text-white/80 mt-1">Job Request Portal</p>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              Submit a Job Request
            </h2>
            <p className="text-slate-600 mt-1">
              Hello {clientInfo.client.name}! Fill out the form below to request a new position.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                Position Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g., Warehouse Operator, Forklift Driver"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Location & Contract Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Paris, Lyon"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="contractType" className="block text-sm font-medium text-slate-700 mb-1">
                  Contract Type
                </label>
                <select
                  id="contractType"
                  name="contractType"
                  value={formData.contractType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {CONTRACT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Salary & Start Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="salaryRange" className="block text-sm font-medium text-slate-700 mb-1">
                  Salary Range
                </label>
                <input
                  type="text"
                  id="salaryRange"
                  name="salaryRange"
                  value={formData.salaryRange}
                  onChange={handleChange}
                  placeholder="e.g., 30-35k EUR/year"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1">
                  Expected Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                Job Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe the role, responsibilities, and working conditions..."
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Requirements */}
            <div>
              <label htmlFor="requirements" className="block text-sm font-medium text-slate-700 mb-1">
                Requirements
              </label>
              <textarea
                id="requirements"
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                rows={3}
                placeholder="Required skills, certifications, experience..."
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Any other information..."
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !formData.title}
              className="w-full py-3 px-4 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: primaryColor }}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>
            Powered by{" "}
            <a href="/" className="text-indigo-600 hover:text-indigo-700 font-medium">
              QuestHire
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
