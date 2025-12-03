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
    color: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 font-medium" 
  },
  ACTIVE: { 
    label: "Active", 
    labelFr: "Actif",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium" 
  },
  PAUSED: { 
    label: "Paused", 
    labelFr: "En pause",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-medium" 
  },
  ARCHIVED: { 
    label: "Archived", 
    labelFr: "Archivé",
    color: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 font-medium" 
  },
};

// =============================================================================
// APPLICATION STATUS (Pipeline)
// =============================================================================

export const APPLICATION_STATUS_COLORS: Record<string, { label: string; labelFr: string; color: string }> = {
  NEW: { 
    label: "New", 
    labelFr: "Nouveau",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-medium" 
  },
  CONTACTED: { 
    label: "Contacted", 
    labelFr: "Contacté",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-medium" 
  },
  QUALIFIED: { 
    label: "Qualified", 
    labelFr: "Qualifié",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium" 
  },
  PLACED: { 
    label: "Placed", 
    labelFr: "Recruté",
    color: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 font-medium" 
  },
  REJECTED: { 
    label: "Rejected", 
    labelFr: "Refusé",
    color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 font-medium" 
  },
};

// =============================================================================
// CANDIDATE PROFILE STATUS
// =============================================================================

export const CANDIDATE_STATUS_COLORS: Record<string, { label: string; labelFr: string; color: string }> = {
  ACTIVE: { 
    label: "Active", 
    labelFr: "Actif",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium" 
  },
  DO_NOT_CONTACT: { 
    label: "Do Not Contact", 
    labelFr: "Ne pas contacter",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-medium" 
  },
  BLACKLISTED: { 
    label: "Blacklisted", 
    labelFr: "Liste noire",
    color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 font-medium" 
  },
};

// =============================================================================
// JOB REQUEST STATUS
// =============================================================================

export const JOB_REQUEST_STATUS_COLORS: Record<string, { label: string; labelFr: string; color: string }> = {
  NEW: { 
    label: "New", 
    labelFr: "Nouveau",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-medium" 
  },
  IN_REVIEW: { 
    label: "In Review", 
    labelFr: "En cours",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-medium" 
  },
  CONVERTED_TO_JOB: { 
    label: "Converted", 
    labelFr: "Converti",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium" 
  },
  REJECTED: { 
    label: "Rejected", 
    labelFr: "Refusé",
    color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 font-medium" 
  },
};

// =============================================================================
// TIMESHEET STATUS
// =============================================================================

export const TIMESHEET_STATUS_COLORS: Record<string, { label: string; labelFr: string; color: string }> = {
  PENDING: { 
    label: "Pending", 
    labelFr: "En attente",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-medium" 
  },
  APPROVED: { 
    label: "Approved", 
    labelFr: "Approuvé",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium" 
  },
  REJECTED: { 
    label: "Rejected", 
    labelFr: "Refusé",
    color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 font-medium" 
  },
  PAID: { 
    label: "Paid", 
    labelFr: "Payé",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-medium" 
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getStatusColor(
  statusMap: Record<string, { color: string }>,
  status: string,
  fallback = "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-400 font-medium"
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
