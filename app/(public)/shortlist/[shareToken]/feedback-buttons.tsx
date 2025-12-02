"use client";

import { useState, useEffect } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface FeedbackButtonsProps {
  shareToken: string;
  applicationId: string;
  candidateName: string;
}

type Decision = "PENDING" | "APPROVED" | "REJECTED";

interface FeedbackState {
  decision: Decision;
  comment: string | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function FeedbackButtons({
  shareToken,
  applicationId,
  candidateName,
}: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [comment, setComment] = useState("");
  const [pendingDecision, setPendingDecision] = useState<"APPROVED" | "REJECTED" | null>(null);

  // Fetch existing feedback on mount
  useEffect(() => {
    async function fetchFeedback() {
      try {
        const res = await fetch(`/api/shortlists/public/${shareToken}/feedback`);
        if (res.ok) {
          const data = await res.json();
          if (data.feedback[applicationId]) {
            setFeedback({
              decision: data.feedback[applicationId].decision as Decision,
              comment: data.feedback[applicationId].comment,
            });
          }
        }
      } catch {
        // Ignore errors - just show buttons
      } finally {
        setLoading(false);
      }
    }

    fetchFeedback();
  }, [shareToken, applicationId]);

  const submitFeedback = async (decision: "APPROVED" | "REJECTED", feedbackComment?: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shortlists/public/${shareToken}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          decision,
          comment: feedbackComment || undefined,
        }),
      });

      if (res.ok) {
        setFeedback({
          decision,
          comment: feedbackComment || null,
        });
        setShowCommentModal(false);
        setComment("");
        setPendingDecision(null);
      }
    } catch {
      // Ignore errors
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = () => {
    submitFeedback("APPROVED");
  };

  const handleReject = () => {
    setPendingDecision("REJECTED");
    setShowCommentModal(true);
  };

  const handleCommentSubmit = () => {
    if (pendingDecision) {
      submitFeedback(pendingDecision, comment);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 mt-3">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show feedback badge if already submitted
  if (feedback && feedback.decision !== "PENDING") {
    return (
      <div className="mt-3">
        <span
          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            feedback.decision === "APPROVED"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {feedback.decision === "APPROVED" ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approved
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Rejected
            </>
          )}
        </span>
        {feedback.comment && (
          <p className="text-xs text-slate-500 mt-1 italic">"{feedback.comment}"</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleApprove}
          disabled={submitting}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Approve
        </button>
        <button
          onClick={handleReject}
          disabled={submitting}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reject
        </button>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Reject {candidateName}?
              </h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment explaining your decision..."
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setComment("");
                  setPendingDecision(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
