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
      const date = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
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
        title: "Name Required",
        description: "Please enter a name for the shortlist",
        variant: "warning",
      });
      return;
    }

    if (selectedApplicationIds.length === 0) {
      toast({
        title: "No Candidates",
        description: "Please select at least one candidate",
        variant: "warning",
      });
      return;
    }

    // Demo mode: simulate success
    if (isDemo) {
      toast({
        title: "Demo Mode",
        description: "Shortlist creation simulated. In production, this would create a real shortlist.",
        variant: "warning",
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
        throw new Error(data.error || "Failed to create shortlist");
      }

      const data = await res.json();
      const shareUrl = data.shortlist?.shareUrl;

      // Copy link if requested
      if (copyLink && shareUrl) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Shortlist Created",
            description: "Share link copied to clipboard!",
            variant: "success",
          });
        } catch {
          toast({
            title: "Shortlist Created",
            description: "Shortlist created successfully",
            variant: "success",
          });
        }
      } else {
        toast({
          title: "Shortlist Created",
          description: "Shortlist created successfully",
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
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create shortlist",
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
          <h2 className="text-lg font-semibold text-slate-900">Create Shortlist</h2>
          <p className="text-sm text-slate-500 mt-1">
            {selectedApplicationIds.length} candidate{selectedApplicationIds.length !== 1 ? "s" : ""} selected
          </p>
        </div>

        {/* Demo Warning */}
        {isDemo && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              <strong>Demo Mode:</strong> Shortlist will be simulated but not saved.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Shortlist Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Senior Developers - Week 1"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Client (optional)
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            >
              <option value="">No client</option>
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
              Internal Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add notes for your team..."
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
              Copy share link to clipboard after creation
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
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedApplicationIds.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating..." : "Create Shortlist"}
          </button>
        </div>
      </div>
    </div>
  );
}
