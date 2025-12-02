"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// TYPES
// =============================================================================

interface Client {
  id: string;
  name: string;
  contactName: string | null;
}

interface ClientSelectorProps {
  jobId: string;
  currentClientId: string | null;
  currentClientName: string | null;
  isDemo: boolean;
  canEdit: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ClientSelector({
  jobId,
  currentClientId,
  currentClientName,
  isDemo,
  canEdit,
}: ClientSelectorProps) {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ id: string | null; name: string | null }>({
    id: currentClientId,
    name: currentClientName,
  });
  const [saving, setSaving] = useState(false);

  // Fetch clients when dropdown opens
  useEffect(() => {
    if (showDropdown && clients.length === 0) {
      fetchClients();
    }
  }, [showDropdown]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients?limit=100&isActive=true");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch {
      // Ignore errors
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = async (client: Client | null) => {
    if (isDemo) {
      toast({
        title: "Demo Mode",
        description: "Cannot modify client in demo mode.",
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client?.id || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update client");
      }

      setSelectedClient({
        id: client?.id || null,
        name: client?.name || null,
      });
      setShowDropdown(false);

      toast({
        title: "Client Updated",
        description: client ? `Job linked to ${client.name}` : "Client removed from job",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update client",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    // Read-only view
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-medium text-slate-500 mb-2">Client</h3>
        {selectedClient.id ? (
          <Link
            href={`/dashboard/clients/${selectedClient.id}`}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {selectedClient.name}
          </Link>
        ) : (
          <p className="text-slate-400">No client linked</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 relative">
      <h3 className="text-sm font-medium text-slate-500 mb-2">Client</h3>
      
      {/* Current selection / trigger */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={saving}
        className="w-full text-left px-3 py-2 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors flex items-center justify-between"
      >
        <span className={selectedClient.name ? "text-slate-900" : "text-slate-400"}>
          {selectedClient.name || "Select a client..."}
        </span>
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Link to client */}
      {selectedClient.id && (
        <Link
          href={`/dashboard/clients/${selectedClient.id}`}
          className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
        >
          View client →
        </Link>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-slate-500">Loading...</div>
          ) : (
            <>
              {/* Clear option */}
              {selectedClient.id && (
                <button
                  onClick={() => handleSelectClient(null)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 border-b border-slate-100"
                >
                  Remove client
                </button>
              )}
              
              {/* Client list */}
              {clients.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No clients found.{" "}
                  <Link href="/dashboard/clients" className="text-indigo-600 hover:text-indigo-700">
                    Add one
                  </Link>
                </div>
              ) : (
                clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${
                      client.id === selectedClient.id ? "bg-indigo-50 text-indigo-700" : "text-slate-700"
                    }`}
                  >
                    <p className="font-medium">{client.name}</p>
                    {client.contactName && (
                      <p className="text-xs text-slate-500">{client.contactName}</p>
                    )}
                  </button>
                ))
              )}
            </>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
