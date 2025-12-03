/**
 * Centralized status badge color utilities
 * Ensures consistent, readable colors across light and dark modes
 */

// =============================================================================
// JOB STATUS
// =============================================================================

export const JOB_STATUS_COLORS: Record<string, { label: string; labelFr: string; color: string }> = {
  DRAFT: { 
    label: "Draft", 
    labelFr: "Brouillon",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700" 
  },
  ACTIVE: { 
    label: "Active", 
    labelFr: "Actif",
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
  },
  PAUSED: { 
    label: "Paused", 
    labelFr: "En pause",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800" 
  },
  ARCHIVED: { 
    label: "Archived", 
    labelFr: "Archivé",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700" 
  },
};

// =============================================================================
// APPLICATION STATUS (Pipeline)
// =============================================================================

export const APPLICATION_STATUS_COLORS: Record<string, { label: string; labelFr: string; color: string }> = {
  NEW: { 
    label: "New", 
    labelFr: "Nouveau",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800" 
  },
  CONTACTED: { 
    label: "Contacted", 
    labelFr: "Contacté",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800" 
  },
  QUALIFIED: { 
    label: "Qualified", 
    labelFr: "Qualifié",
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
  },
  PLACED: { 
    label: "Placed", 
    labelFr: "Recruté",
    color: "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800" 
  },
  REJECTED: { 
    label: "Rejected", 
    labelFr: "Refusé",
    color: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800" 
  },
};

// =============================================================================
// CANDIDATE PROFILE STATUS
// =============================================================================

export const CANDIDATE_STATUS_COLORS: Record<string, { label: string; labelFr: string; color: string }> = {
  ACTIVE: { 
    label: "Active", 
    labelFr: "Actif",
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
  },
  DO_NOT_CONTACT: { 
    label: "Do Not Contact", 
    labelFr: "Ne pas contacter",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800" 
  },
  BLACKLISTED: { 
    label: "Blacklisted", 
    labelFr: "Liste noire",
    color: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800" 
  },
};

// =============================================================================
// JOB REQUEST STATUS
// =============================================================================

export const JOB_REQUEST_STATUS_COLORS: Record<string, { label: string; labelFr: string; color: string }> = {
  NEW: { 
    label: "New", 
    labelFr: "Nouveau",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800" 
  },
  IN_REVIEW: { 
    label: "In Review", 
    labelFr: "En cours",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800" 
  },
  CONVERTED_TO_JOB: { 
    label: "Converted", 
    labelFr: "Converti",
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
  },
  REJECTED: { 
    label: "Rejected", 
    labelFr: "Refusé",
    color: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800" 
  },
};

// =============================================================================
// TIMESHEET STATUS
// =============================================================================

export const TIMESHEET_STATUS_COLORS: Record<string, { label: string; labelFr: string; color: string }> = {
  PENDING: { 
    label: "Pending", 
    labelFr: "En attente",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800" 
  },
  APPROVED: { 
    label: "Approved", 
    labelFr: "Approuvé",
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
  },
  REJECTED: { 
    label: "Rejected", 
    labelFr: "Refusé",
    color: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800" 
  },
  PAID: { 
    label: "Paid", 
    labelFr: "Payé",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800" 
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getStatusColor(
  statusMap: Record<string, { color: string }>,
  status: string,
  fallback = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
): string {
  return statusMap[status]?.color || fallback;
}

export function getStatusLabel(
  statusMap: Record<string, { label: string; labelFr: string }>,
  status: string,
  useFrench = true
): string {
  const entry = statusMap[status];
  if (!entry) return status;
  return useFrench ? entry.labelFr : entry.label;
}
