"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ClientList } from "./components/client-list";
import { AddClientModal } from "./components/add-client-modal";

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

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function ClientsPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchClients = async (q?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("limit", "50");

      const res = await fetch(`/api/clients?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch clients");
      }
      const data = await res.json();
      setClients(data.clients);
      setPagination(data.pagination);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load clients",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClients(searchQuery);
  };

  const handleClientCreated = () => {
    setShowAddModal(false);
    fetchClients(searchQuery);
    toast({
      title: "Client Created",
      description: "The client has been added successfully.",
      variant: "success",
    });
  };

  if (loading && clients.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
            <p className="text-slate-500 mt-1">Manage your client relationships</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 mt-1">
            Manage your client relationships
            {pagination && ` • ${pagination.total} total`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Add Client
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clients by name or email..."
          className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Client List */}
      <ClientList clients={clients} loading={loading} />

      {/* Add Client Modal */}
      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleClientCreated}
        />
      )}
    </div>
  );
}
