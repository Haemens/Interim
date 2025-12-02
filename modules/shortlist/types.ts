/**
 * Shortlist Domain Types
 */

export interface ShortlistSummary {
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
  };
  client: {
    id: string;
    name: string;
  } | null;
  candidatesCount: number;
  feedback: {
    approved: number;
    rejected: number;
    pending: number;
  };
}

export interface ShortlistDetail extends ShortlistSummary {
  items: ShortlistItemDetail[];
}

export interface ShortlistItemDetail {
  id: string;
  order: number;
  application: {
    id: string;
    fullName: string;
    email: string | null;
    status: string;
  };
  feedback: {
    decision: string;
    comment: string | null;
  } | null;
}

/**
 * Rich shortlist detail with full candidate information
 */
export interface ShortlistDetailWithCandidates {
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

export interface ShortlistCandidate {
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

export interface ShortlistFilters {
  jobId?: string;
  clientId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateShortlistInput {
  jobId: string;
  name: string;
  note?: string;
  clientId?: string | null;
  applicationIds: string[];
}
