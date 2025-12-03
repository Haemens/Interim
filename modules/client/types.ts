/**
 * Client Domain Types
 * 
 * Types for Client 360° view and client portal features.
 */

// =============================================================================
// CLIENT SUMMARY (for list views)
// =============================================================================

export interface ClientSummary {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  sector: string | null;
  isActive: boolean;
  
  // Aggregated counts
  openJobsCount: number;
  activeJobRequestsCount: number;
  shortlistsCount: number;
  
  // Activity tracking
  lastActivityAt: Date | null;
  createdAt: Date;
}

// =============================================================================
// CLIENT DETAIL (for 360° view)
// =============================================================================

export interface ClientJobRequest {
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  status: string;
  createdAt: Date;
  convertedJobId: string | null;
}

export interface ClientJob {
  id: string;
  title: string;
  location: string | null;
  status: string;
  applicationsCount: number;
  createdAt: Date;
}

export interface ClientShortlist {
  id: string;
  name: string;
  shareToken: string;
  jobTitle: string;
  jobId: string;
  candidatesCount: number;
  approvalsCount: number;
  rejectionsCount: number;
  pendingCount: number;
  createdAt: Date;
}

export interface ClientTimesheet {
  id: string;
  candidateName: string;
  periodStart: Date;
  periodEnd: Date;
  totalHours: number;
  status: string;
  createdAt: Date;
}

export interface ClientKPIs {
  totalJobs: number;
  activeJobs: number;
  totalJobRequests: number;
  pendingJobRequests: number;
  totalShortlists: number;
  totalCandidatesReviewed: number;
  totalApprovals: number;
  totalRejections: number;
  totalPlacements: number; // Applications with status PLACED linked to client jobs
}

export interface ClientDetail {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  sector: string | null;
  notes: string | null;
  isActive: boolean;
  requestToken: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Related data
  jobRequests: ClientJobRequest[];
  jobs: ClientJob[];
  shortlists: ClientShortlist[];
  timesheets: ClientTimesheet[];
  
  // KPIs
  kpis: ClientKPIs;
}

// =============================================================================
// CLIENT PORTAL (public view for clients)
// =============================================================================

export interface ClientPortalJobRequest {
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  status: string;
  createdAt: string; // ISO string for serialization
}

export interface ClientPortalShortlist {
  id: string;
  name: string;
  shareToken: string;
  jobTitle: string;
  candidatesCount: number;
  createdAt: string; // ISO string
}

export interface ClientPortalData {
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
  jobRequests: ClientPortalJobRequest[];
  shortlists: ClientPortalShortlist[];
}

// =============================================================================
// QUERY PARAMS
// =============================================================================

export interface GetClientsParams {
  q?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface ClientsListResult {
  clients: ClientSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
