"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// TYPES
// =============================================================================

interface JobData {
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  sector: string | null;
  description: string;
  profile: string | null;
  benefits: string | null;
  tags: string[];
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
}

interface EditJobFormProps {
  job: JobData;
  isDemo: boolean;
  onClose: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function EditJobForm({ job, isDemo, onClose }: EditJobFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: job.title,
    location: job.location || "",
    contractType: job.contractType || "",
    salaryMin: job.salaryMin?.toString() || "",
    salaryMax: job.salaryMax?.toString() || "",
    currency: job.currency || "EUR",
    sector: job.sector || "",
    description: job.description,
    profile: job.profile || "",
    benefits: job.benefits || "",
    tags: job.tags.join(", "),
    status: job.status,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemo) {
      toast({
        title: "Demo Mode",
        description: "Cannot edit jobs in demo mode. Sign up for a free trial!",
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
      };

      // Only include optional fields if they have values
      if (formData.location) payload.location = formData.location;
      else payload.location = null;

      if (formData.contractType) payload.contractType = formData.contractType;
      else payload.contractType = null;

      if (formData.salaryMin) payload.salaryMin = parseInt(formData.salaryMin, 10);
      else payload.salaryMin = null;

      if (formData.salaryMax) payload.salaryMax = parseInt(formData.salaryMax, 10);
      else payload.salaryMax = null;

      if (formData.currency) payload.currency = formData.currency;

      if (formData.sector) payload.sector = formData.sector;
      else payload.sector = null;

      if (formData.profile) payload.profile = formData.profile;
      else payload.profile = null;

      if (formData.benefits) payload.benefits = formData.benefits;
      else payload.benefits = null;

      // Parse tags
      const tags = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      payload.tags = tags;

      const response = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (data.code === "DEMO_READ_ONLY") {
          toast({
            title: "Demo Mode",
            description: data.error,
            variant: "warning",
          });
          return;
        }

        if (data.code === "JOB_LIMIT_REACHED") {
          toast({
            title: "Plan Limit Reached",
            description: `You've reached the maximum of ${data.maxAllowed} active jobs on the ${data.planDisplayName} plan. Upgrade to publish more jobs.`,
            variant: "error",
          });
          return;
        }

        throw new Error(data.error || "Failed to update job");
      }

      toast({
        title: "Job Updated",
        description: `"${data.job.title}" has been updated successfully.`,
        variant: "success",
      });

      onClose();
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update job",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Edit Job</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Demo warning */}
        {isDemo && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <strong>Demo Mode:</strong> Changes cannot be saved. Sign up for a free trial to edit jobs.
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active (Published)</option>
              <option value="PAUSED">Paused</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {formData.status === "ACTIVE" && "Job will be visible on your public careers page"}
              {formData.status === "DRAFT" && "Job is not visible to candidates"}
              {formData.status === "PAUSED" && "Job is temporarily hidden from candidates"}
              {formData.status === "ARCHIVED" && "Job is archived and no longer accepting applications"}
            </p>
          </div>

          {/* Location & Contract Type */}
          <div className="grid grid-cols-2 gap-4">
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
                placeholder="e.g., Paris, France"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="contractType" className="block text-sm font-medium text-slate-700 mb-1">
                Contract Type
              </label>
              <input
                type="text"
                id="contractType"
                name="contractType"
                value={formData.contractType}
                onChange={handleChange}
                placeholder="e.g., CDI, CDD, Interim"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Salary */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="salaryMin" className="block text-sm font-medium text-slate-700 mb-1">
                Min Salary
              </label>
              <input
                type="number"
                id="salaryMin"
                name="salaryMin"
                value={formData.salaryMin}
                onChange={handleChange}
                placeholder="30000"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="salaryMax" className="block text-sm font-medium text-slate-700 mb-1">
                Max Salary
              </label>
              <input
                type="number"
                id="salaryMax"
                name="salaryMax"
                value={formData.salaryMax}
                onChange={handleChange}
                placeholder="50000"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-slate-700 mb-1">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
              </select>
            </div>
          </div>

          {/* Sector */}
          <div>
            <label htmlFor="sector" className="block text-sm font-medium text-slate-700 mb-1">
              Sector
            </label>
            <input
              type="text"
              id="sector"
              name="sector"
              value={formData.sector}
              onChange={handleChange}
              placeholder="e.g., IT, Healthcare, Finance"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Job Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={5}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Profile */}
          <div>
            <label htmlFor="profile" className="block text-sm font-medium text-slate-700 mb-1">
              Candidate Profile
            </label>
            <textarea
              id="profile"
              name="profile"
              value={formData.profile}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the ideal candidate..."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Benefits */}
          <div>
            <label htmlFor="benefits" className="block text-sm font-medium text-slate-700 mb-1">
              Benefits
            </label>
            <textarea
              id="benefits"
              name="benefits"
              value={formData.benefits}
              onChange={handleChange}
              rows={3}
              placeholder="List the benefits of this position..."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-slate-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., JavaScript, React, Remote (comma-separated)"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-slate-500">Separate tags with commas</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDemo}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// EDIT BUTTON COMPONENT
// =============================================================================

interface EditJobButtonProps {
  job: JobData;
  isDemo: boolean;
  canEdit: boolean;
}

export function EditJobButton({ job, isDemo, canEdit }: EditJobButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  if (!canEdit) return null;

  const handleClick = () => {
    if (isDemo) {
      toast({
        title: "Demo Mode",
        description: "Job editing is disabled in demo mode. Sign up for a free trial!",
        variant: "warning",
      });
      // Still open the form to show the demo warning
    }
    setIsOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Job
      </button>

      {isOpen && (
        <EditJobForm
          job={job}
          isDemo={isDemo}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
