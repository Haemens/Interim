"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// TYPES
// =============================================================================

interface ShortlistRowActionsProps {
  shortlistId: string;
  shareUrl: string;
  shareToken: string;
  isDemo: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ShortlistRowActions({
  shortlistId,
  shareUrl,
  shareToken,
  isDemo,
}: ShortlistRowActionsProps) {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);

  const handleCopyLink = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied",
        description: "Shortlist link copied to clipboard",
        variant: "success",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Could not copy link to clipboard",
        variant: "error",
      });
    } finally {
      setCopying(false);
    }
  };

  const handleOpenPublic = () => {
    window.open(`/shortlist/${shareToken}`, "_blank");
  };

  return (
    <div className="flex items-center gap-1">
      {/* View Details */}
      <Link
        href={`/dashboard/shortlists/${shortlistId}`}
        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        title="View details"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </Link>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        disabled={copying}
        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        title="Copy share link"
      >
        {copying ? (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        )}
      </button>

      {/* Open Public View */}
      <button
        onClick={handleOpenPublic}
        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
        title="Open public view"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>

      {/* Demo mode indicator */}
      {isDemo && (
        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          Demo
        </span>
      )}
    </div>
  );
}
