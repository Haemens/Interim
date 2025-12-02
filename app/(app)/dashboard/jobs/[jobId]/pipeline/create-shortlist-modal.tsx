"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// TYPES
// =============================================================================

interface Client {
  id: string;
  name: string;
  contactName: string | null;
}

interface CreateShortlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  selectedApplicationIds: string[];
  isDemo: boolean;
  onSuccess: (shareUrl: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CreateShortlistModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  selectedApplicationIds,
  isDemo,
  onSuccess,
}: CreateShortlistModalProps) {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [note, setNote] = useState("");
  const [copyLink, setCopyLink] = useState(true);

  // Set default name when modal opens
  useEffect(() => {
    if (isOpen) {
      const date = new Date().toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      });
      setName(`${jobTitle} - ${date}`);
      fetchClients();
    }
  }, [isOpen, jobTitle]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Nom requis",
        description: "Veuillez entrer un nom pour la shortlist",
        variant: "warning",
      });
      return;
    }

    if (selectedApplicationIds.length === 0) {
      toast({
        title: "Aucun candidat",
        description: "Veuillez sélectionner au moins un candidat",
        variant: "warning",
      });
      return;
    }

    // Demo mode: simulate success
    if (isDemo) {
      toast({
        title: "Mode Démo",
        description: "Création de shortlist simulée. Inscrivez-vous pour utiliser cette fonctionnalité !",
        variant: "success",
      });
      onSuccess("https://demo.questhire.com/shortlist/demo-token");
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/shortlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          name: name.trim(),
          note: note.trim() || undefined,
          clientId: clientId || null,
          applicationIds: selectedApplicationIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Impossible de créer la shortlist");
      }

      const data = await res.json();
      const shareUrl = data.shortlist?.shareUrl;

      // Copy link if requested
      if (copyLink && shareUrl) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Shortlist créée",
            description: "Lien de partage copié !",
            variant: "success",
          });
        } catch {
          toast({
            title: "Shortlist créée",
            description: "Shortlist créée avec succès",
            variant: "success",
          });
        }
      } else {
        toast({
          title: "Shortlist créée",
          description: "Shortlist créée avec succès",
          variant: "success",
        });
      }

      onSuccess(shareUrl);
      onClose();

      // Reset form
      setName("");
      setClientId("");
      setNote("");
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec de la création",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Créer une Shortlist</h2>
          <p className="text-sm text-slate-500 mt-1">
            {selectedApplicationIds.length} candidat{selectedApplicationIds.length !== 1 ? "s" : ""} sélectionné{selectedApplicationIds.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Demo Warning */}
        {isDemo && (
          <div className="mx-6 mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-3">
            <span className="text-xl">🚀</span>
            <div>
              <p className="text-sm font-medium text-indigo-900">
                Fonctionnalité Premium
              </p>
              <p className="text-xs text-indigo-700 mt-0.5">
                En mode démo, la shortlist est simulée. Passez en Pro pour partager de vrais profils avec vos clients.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom de la Shortlist *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Développeurs Senior - Semaine 1"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Client (optionnel)
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            >
              <option value="">Aucun client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.contactName && ` (${client.contactName})`}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note interne (optionnel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajoutez des notes pour votre équipe..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Copy Link Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={copyLink}
              onChange={(e) => setCopyLink(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700">
              Copier le lien de partage après création
            </span>
          </label>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedApplicationIds.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Création..." : "Créer la Shortlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
