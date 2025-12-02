"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ShortlistHeader } from "../components/shortlist-header";
import { ShortlistCandidatesTable } from "../components/shortlist-candidates-table";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Lock, ArrowLeft } from "lucide-react";

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

interface ShortlistDetail {
  id: string;
  name: string;
  shareToken: string;
  shareUrl: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    status: string;
    location: string | null;
  };
  client: {
    id: string;
    name: string;
    contactName: string | null;
    contactEmail: string | null;
  } | null;
  candidates: ShortlistCandidate[];
  stats: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function ShortlistDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const shortlistId = params.id as string;

  const [shortlist, setShortlist] = useState<ShortlistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canUseShortlists, setCanUseShortlists] = useState(true);

  useEffect(() => {
    async function fetchShortlist() {
      try {
        const res = await fetch(`/api/shortlists/${shortlistId}`);

        if (res.status === 403) {
          const data = await res.json();
          if (data.code === "PLAN_LIMIT") {
            setCanUseShortlists(false);
            return;
          }
          setError("You don't have permission to view this shortlist");
          return;
        }

        if (res.status === 404) {
          setError("Shortlist not found");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to load shortlist");
        }

        const data = await res.json();
        setShortlist(data.shortlist);
      } catch {
        setError("Failed to load shortlist");
        toast({
          title: "Error",
          description: "Failed to load shortlist details",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    if (shortlistId) {
      fetchShortlist();
    }
  }, [shortlistId, toast]);

  // Plan gating: show upsell
  if (!canUseShortlists) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Shortlist Detail"
          description="View and manage your candidate shortlist."
        />

        <Card className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-none">
          <CardContent className="p-8">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Upgrade to View Shortlists</h2>
              </div>
              <p className="text-indigo-100 text-lg">
                Shortlists allow you to share curated candidate selections with clients via a
                beautiful public page. Collect feedback and track approvals in one place.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <Button asChild size="lg" variant="secondary" className="font-semibold">
                  <Link href="/dashboard/billing">
                    Upgrade to Pro
                  </Link>
                </Button>
                <span className="text-indigo-200 text-sm font-medium">Available on Pro & Agency+ plans</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Loading shortlist...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !shortlist) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold">Unable to Load Shortlist</h2>
            <p className="text-muted-foreground">{error || "Something went wrong"}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/shortlists">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shortlists
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/shortlists" className="hover:text-foreground transition-colors">Shortlists</Link>
        <span>/</span>
        <span>{shortlist.name}</span>
      </div>

      {/* Header */}
      <ShortlistHeader shortlist={shortlist} />

      {/* Candidates Table */}
      <ShortlistCandidatesTable
        candidates={shortlist.candidates}
        jobId={shortlist.job.id}
      />
    </div>
  );
}
