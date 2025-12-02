"use client";

import Link from "next/link";

// =============================================================================
// TYPES
// =============================================================================

interface ShortlistItem {
  id: string;
  name: string;
  shareToken: string;
  createdAt: string;
  candidatesCount: number;
  feedback: {
    approved: number;
    rejected: number;
    pending: number;
  };
}

interface ShortlistsSummaryProps {
  items: ShortlistItem[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ShortlistsSummary({ items }: ShortlistsSummaryProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Client Shortlists & Feedback</h3>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No shortlists shared yet for this job.</p>
          <p className="text-slate-400 text-xs mt-1">
            Create a shortlist from the pipeline to share candidates with clients.
          </p>
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-slate-600">Shortlist</th>
              <th className="text-center px-6 py-3 text-sm font-medium text-slate-600">Candidates</th>
              <th className="text-center px-6 py-3 text-sm font-medium text-slate-600">Feedback</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/shortlists/${item.id}`}
                    className="font-medium text-slate-900 hover:text-indigo-600"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-slate-700 font-medium">{item.candidatesCount}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-3 text-sm">
                    <span className="text-green-600" title="Approved">
                      ✓ {item.feedback.approved}
                    </span>
                    <span className="text-red-600" title="Rejected">
                      ✗ {item.feedback.rejected}
                    </span>
                    {item.feedback.pending > 0 && (
                      <span className="text-slate-400" title="Pending">
                        ○ {item.feedback.pending}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/dashboard/shortlists/${item.id}`}
                      className="text-sm text-slate-600 hover:text-slate-800"
                    >
                      View
                    </Link>
                    <a
                      href={`/shortlist/${item.shareToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Open Link →
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
