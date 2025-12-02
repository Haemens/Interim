"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Briefcase, Users, ExternalLink, Plus, Calendar, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface JobRequest {
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  status: string;
  createdAt: string;
}

interface Shortlist {
  id: string;
  name: string;
  shareToken: string;
  jobTitle: string;
  candidatesCount: number;
  createdAt: string;
}

interface PortalData {
  client: {
    id: string;
    name: string;
    contactName: string | null;
  };
  agency: {
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
  };
  jobRequests: JobRequest[];
  shortlists: Shortlist[];
}

// =============================================================================
// STATUS CONFIG
// =============================================================================

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  NEW: { label: "Submitted", variant: "default" },
  IN_REVIEW: { label: "Under Review", variant: "secondary" },
  CONVERTED_TO_JOB: { label: "Approved", variant: "default" }, // Use primary color for success/approved
  REJECTED: { label: "Closed", variant: "destructive" },
};

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function ClientPortalPage() {
  const params = useParams();
  const requestToken = params.requestToken as string;

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "shortlists">("requests");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/client/${requestToken}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("This portal link is invalid or has expired.");
          } else {
            setError("Failed to load portal. Please try again.");
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load portal. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (requestToken) {
      fetchData();
    }
  }, [requestToken]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Loading your portal...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Portal Unavailable</h1>
              <p className="text-muted-foreground mt-1">{error || "Unable to load portal data."}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryColor = data.agency.primaryColor || "#4F46E5";

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <header className="py-12 px-4 relative overflow-hidden bg-primary text-primary-foreground shadow-md">
        <div 
          className="absolute inset-0 opacity-10"
          style={{ 
            backgroundColor: primaryColor,
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "20px 20px" 
          }}
        />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              {data.agency.logoUrl && (
                <img
                  src={data.agency.logoUrl}
                  alt={data.agency.name}
                  className="h-10 mb-4 bg-white rounded-md p-1"
                />
              )}
              <h1 className="text-3xl font-bold tracking-tight">{data.agency.name}</h1>
              <p className="text-primary-foreground/80 mt-1 text-lg">Client Portal</p>
            </div>
            <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg p-4 border border-primary-foreground/20">
              <p className="text-sm font-medium text-primary-foreground/80">Welcome back,</p>
              <p className="text-lg font-semibold">{data.client.contactName || data.client.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 -mt-8 relative z-20">
        {/* Quick Actions */}
        <Card className="mb-8 shadow-lg border-none">
          <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold">Need to fill a position?</h2>
              <p className="text-muted-foreground mt-1">
                Submit a new job request and we'll get back to you shortly.
              </p>
            </div>
            <Button size="lg" className="gap-2 shadow-md" asChild>
              <Link href={`/client/${requestToken}/request`}>
                <Plus className="w-5 h-5" />
                New Request
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-border pb-px">
            <button
              onClick={() => setActiveTab("requests")}
              className={cn(
                "pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                activeTab === "requests"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Briefcase className="w-4 h-4" />
              Your Requests
              <Badge variant="secondary" className="ml-1 px-1.5 h-5 min-w-5 flex items-center justify-center">
                {data.jobRequests.length}
              </Badge>
            </button>
            <button
              onClick={() => setActiveTab("shortlists")}
              className={cn(
                "pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                activeTab === "shortlists"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-4 h-4" />
              Candidate Shortlists
              <Badge variant="secondary" className="ml-1 px-1.5 h-5 min-w-5 flex items-center justify-center">
                {data.shortlists.length}
              </Badge>
            </button>
          </div>

          {/* Job Requests Tab */}
          {activeTab === "requests" && (
            <div className="space-y-4">
              {data.jobRequests.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
                      <Briefcase className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">No requests yet</h3>
                      <p className="text-muted-foreground">
                        Submit your first job request to get started.
                      </p>
                    </div>
                    <Button asChild>
                      <Link href={`/client/${requestToken}/request`}>
                        Submit Request
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                data.jobRequests.map((req) => (
                  <Card key={req.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">{req.title}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            {req.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                {req.location}
                              </div>
                            )}
                            {req.contractType && (
                              <div className="flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5" />
                                {req.contractType}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(req.createdAt)}
                            </div>
                          </div>
                        </div>
                        <Badge variant={STATUS_CONFIG[req.status]?.variant || "outline"} className="w-fit">
                          {STATUS_CONFIG[req.status]?.label || req.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Shortlists Tab */}
          {activeTab === "shortlists" && (
            <div className="space-y-4">
              {data.shortlists.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">No shortlists yet</h3>
                      <p className="text-muted-foreground">
                        When we have candidates to share, they'll appear here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                data.shortlists.map((sl) => (
                  <Card key={sl.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">{sl.name}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5" />
                              For: {sl.jobTitle}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              {sl.candidatesCount} candidates
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(sl.createdAt)}
                            </div>
                          </div>
                        </div>
                        <Button asChild variant="outline" className="gap-2 group">
                          <a href={`/shortlist/${sl.shareToken}`}>
                            Review Candidates
                            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pb-8 text-sm text-muted-foreground">
          <p>
            Powered by{" "}
            <a href="/" className="text-primary hover:underline font-medium">
              QuestHire
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
