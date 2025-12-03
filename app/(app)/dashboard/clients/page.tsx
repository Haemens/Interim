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
        // Si c'est une 404 ou liste vide, on peut juste mettre une liste vide
        if (res.status === 404) {
             setClients([]);
             return;
        }
        const data = await res.json();
        throw new Error(data.error || "Échec du chargement des clients");
      }
      const data = await res.json();
      setClients(data.clients);
      setPagination(data.pagination);
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec du chargement des clients",
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
      title: "Client créé",
      description: "Le client a été ajouté avec succès.",
      variant: "success",
    });
  };

    if (loading && clients.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
            <p className="text-muted-foreground mt-1">Gérez vos relations clients</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos relations clients
            {pagination && ` • ${pagination.total} au total`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          Ajouter un client
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="flex-1 px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors"
        >
          Rechercher
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
