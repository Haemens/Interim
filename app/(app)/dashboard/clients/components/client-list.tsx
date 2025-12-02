"use client";

import Link from "next/link";

// =============================================================================
// TYPES
// =============================================================================

interface ClientSummary {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  sector: string | null;
  isActive: boolean;
  openJobsCount: number;
  activeJobRequestsCount: number;
  shortlistsCount: number;
  lastActivityAt: string | null;
  createdAt: string;
}

interface ClientListProps {
  clients: ClientSummary[];
  loading?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ClientList({ clients, loading }: ClientListProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No clients yet</h3>
        <p className="text-muted-foreground">
          Add your first client to start managing relationships.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Client</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Contact</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Sector</th>
            <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">Jobs</th>
            <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">Requests</th>
            <th className="text-center px-6 py-3 text-sm font-medium text-muted-foreground">Shortlists</th>
            <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map((client) => (
            <tr key={client.id} className="hover:bg-muted/50">
              <td className="px-6 py-4">
                <div>
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {client.name}
                  </Link>
                  {!client.isActive && (
                    <span className="ml-2 text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm">
                  {client.contactName && (
                    <p className="text-foreground">{client.contactName}</p>
                  )}
                  <p className="text-muted-foreground">{client.contactEmail}</p>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                {client.sector || "—"}
              </td>
              <td className="px-6 py-4 text-center">
                <span className={`text-sm font-medium ${client.openJobsCount > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                  {client.openJobsCount}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <span className={`text-sm font-medium ${client.activeJobRequestsCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                  {client.activeJobRequestsCount}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <span className="text-sm text-muted-foreground">
                  {client.shortlistsCount}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="text-sm text-primary hover:text-primary/90 font-medium"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
