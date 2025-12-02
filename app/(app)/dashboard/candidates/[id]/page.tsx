"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface Application {
  id: string;
  status: string;
  createdAt: string;
  job: {
    id: string;
    title: string;
    status: string;
  };
}

interface CandidateProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  cvUrl?: string;
  skills: string[];
  sectors: string[];
  lastJobTitle?: string;
  location?: string;
  notes?: string;
  status: "ACTIVE" | "DO_NOT_CONTACT" | "BLACKLISTED";
  consentToContact: boolean;
  firstAppliedAt: string;
  lastAppliedAt: string;
  applications: Application[];
  _count: {
    applications: number;
  };
}

function getStatusBadge(status: CandidateProfile["status"]) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-700";
    case "DO_NOT_CONTACT":
      return "bg-amber-100 text-amber-700";
    case "BLACKLISTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getAppStatusBadge(status: string) {
  switch (status) {
    case "NEW":
      return "bg-blue-100 text-blue-700";
    case "CONTACTED":
      return "bg-amber-100 text-amber-700";
    case "QUALIFIED":
      return "bg-green-100 text-green-700";
    case "PLACED":
      return "bg-emerald-100 text-emerald-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [status, setStatus] = useState<CandidateProfile["status"]>("ACTIVE");
  const [notes, setNotes] = useState("");
  const [skills, setSkills] = useState("");
  const [sectors, setSectors] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    async function fetchCandidate() {
      try {
        const res = await fetch(`/api/candidates/${id}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch candidate");
        }

        const data = await res.json();
        setCandidate(data.candidate);
        setStatus(data.candidate.status);
        setNotes(data.candidate.notes || "");
        setSkills(data.candidate.skills.join(", "));
        setSectors(data.candidate.sectors.join(", "));
        setLocation(data.candidate.location || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load candidate");
      } finally {
        setLoading(false);
      }
    }

    fetchCandidate();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          sectors: sectors.split(",").map((s) => s.trim()).filter(Boolean),
          location: location || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update candidate");
      }

      const data = await res.json();
      setCandidate(data.candidate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading candidate...</div>
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (!candidate) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/candidates"
            className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block"
          >
            ← Back to Talent Pool
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{candidate.fullName}</h1>
          <p className="text-slate-600">{candidate.email}</p>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full ${getStatusBadge(candidate.status)}`}>
          {candidate.status.replace(/_/g, " ")}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium">{candidate.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="font-medium">{candidate.phone || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Location</p>
                <p className="font-medium">{candidate.location || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Last Job Title</p>
                <p className="font-medium">{candidate.lastJobTitle || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-slate-500 mb-2">CV/Resume</p>
                {candidate.cvUrl ? (
                  <div className="flex items-center gap-3">
                    <a
                      href={candidate.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download CV
                    </a>
                    <a
                      href={candidate.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-500 hover:text-slate-700 truncate max-w-xs"
                      title={candidate.cvUrl}
                    >
                      {candidate.cvUrl.split("/").pop()?.slice(0, 30)}...
                    </a>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No CV uploaded</p>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500">Consent to Contact</p>
                <p className="font-medium">{candidate.consentToContact ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>

          {/* Applications */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Applications ({candidate._count.applications})
            </h2>
            {candidate.applications.length === 0 ? (
              <p className="text-slate-500">No applications yet.</p>
            ) : (
              <div className="space-y-3">
                {candidate.applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{app.job.title}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getAppStatusBadge(app.status)}`}
                    >
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Edit Profile</h2>
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CandidateProfile["status"])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DO_NOT_CONTACT">Do Not Contact</option>
                  <option value="BLACKLISTED">Blacklisted</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Region"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Sectors */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sectors (comma-separated)
                </label>
                <input
                  type="text"
                  value={sectors}
                  onChange={(e) => setSectors(e.target.value)}
                  placeholder="Logistics, Manufacturing"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="CACES, night shift, forklift"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Add notes about this candidate..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">First Applied</span>
                <span className="text-slate-900">
                  {new Date(candidate.firstAppliedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Applied</span>
                <span className="text-slate-900">
                  {new Date(candidate.lastAppliedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
