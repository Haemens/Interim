"use client";

import Link from "next/link";

// =============================================================================
// TYPES
// =============================================================================

interface ShortlistCandidate {
  shortlistItemId: string;
  order: number;
  applicationId: string;
  candidateProfileId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  cvUrl: string | null;
  tags: string[];
  createdAt: string;
  clientFeedback: {
    decision: string;
    comment: string | null;
    createdAt: string;
  } | null;
}

interface ShortlistCandidatesTableProps {
  candidates: ShortlistCandidate[];
  jobId: string;
}

// =============================================================================
// STATUS COLORS
// =============================================================================

const APPLICATION_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-amber-100 text-amber-700",
  QUALIFIED: "bg-purple-100 text-purple-700",
  PLACED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const DECISION_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  APPROVED: { bg: "bg-green-100", text: "text-green-700", icon: "✓" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700", icon: "✗" },
  PENDING: { bg: "bg-slate-100", text: "text-slate-500", icon: "○" },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ShortlistCandidatesTable({ candidates, jobId }: ShortlistCandidatesTableProps) {
  if (candidates.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-1">No candidates</h3>
        <p className="text-slate-500">This shortlist has no candidates yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-900">Candidates ({candidates.length})</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">#</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Candidate</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Contact</th>
              <th className="text-center px-6 py-3 text-sm font-medium text-slate-600">Status</th>
              <th className="text-center px-6 py-3 text-sm font-medium text-slate-600">Client Decision</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidates.map((candidate, index) => {
              const decision = candidate.clientFeedback?.decision || "PENDING";
              const decisionStyle = DECISION_COLORS[decision] || DECISION_COLORS.PENDING;

              return (
                <tr key={candidate.shortlistItemId} className="hover:bg-slate-50">
                  {/* Order */}
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {index + 1}
                  </td>

                  {/* Candidate */}
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{candidate.fullName}</p>
                      {candidate.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {candidate.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {candidate.tags.length > 3 && (
                            <span className="text-xs text-slate-400">+{candidate.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {candidate.email && (
                        <p className="text-slate-600">{candidate.email}</p>
                      )}
                      {candidate.phone && (
                        <p className="text-slate-500">{candidate.phone}</p>
                      )}
                      {!candidate.email && !candidate.phone && (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </td>

                  {/* Application Status */}
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${APPLICATION_STATUS_COLORS[candidate.status] || "bg-slate-100"}`}>
                      {candidate.status}
                    </span>
                  </td>

                  {/* Client Decision */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${decisionStyle.bg} ${decisionStyle.text}`}>
                        <span>{decisionStyle.icon}</span>
                        {decision}
                      </span>
                      {candidate.clientFeedback?.comment && (
                        <p className="text-xs text-slate-500 max-w-[150px] truncate" title={candidate.clientFeedback.comment}>
                          &quot;{candidate.clientFeedback.comment}&quot;
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* CV Link */}
                      {candidate.cvUrl && (
                        <a
                          href={candidate.cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View CV"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </a>
                      )}

                      {/* Candidate Profile Link */}
                      {candidate.candidateProfileId && (
                        <Link
                          href={`/dashboard/candidates/${candidate.candidateProfileId}`}
                          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View candidate profile"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </Link>
                      )}

                      {/* Pipeline Link */}
                      <Link
                        href={`/dashboard/jobs/${jobId}/pipeline`}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="View in pipeline"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
