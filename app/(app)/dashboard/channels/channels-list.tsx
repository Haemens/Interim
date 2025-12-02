"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// =============================================================================
// TYPES
// =============================================================================

type ChannelType = "TIKTOK" | "INSTAGRAM" | "LINKEDIN" | "FACEBOOK" | "OTHER";

interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  handle: string | null;
  region: string | null;
  isActive: boolean;
  notes: string | null;
  publicationCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChannelsListProps {
  channels: Channel[];
  canManage: boolean;
  isDemo: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

const CHANNEL_TYPE_CONFIG: Record<ChannelType, { label: string; icon: string; color: string }> = {
  TIKTOK: { label: "TikTok", icon: "🎵", color: "bg-black text-white" },
  INSTAGRAM: { label: "Instagram", icon: "📸", color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white" },
  LINKEDIN: { label: "LinkedIn", icon: "💼", color: "bg-blue-700 text-white" },
  FACEBOOK: { label: "Facebook", icon: "👍", color: "bg-blue-600 text-white" },
  OTHER: { label: "Other", icon: "📱", color: "bg-slate-500 text-white" },
};

// =============================================================================
// CHANNEL FORM MODAL
// =============================================================================

interface ChannelFormProps {
  channel?: Channel | null;
  onClose: () => void;
  onSave: () => void;
  isDemo: boolean;
}

function ChannelFormModal({ channel, onClose, onSave, isDemo }: ChannelFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: channel?.type || "TIKTOK" as ChannelType,
    name: channel?.name || "",
    handle: channel?.handle || "",
    region: channel?.region || "",
    notes: channel?.notes || "",
    isActive: channel?.isActive ?? true,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemo) {
      toast({
        title: "Demo Mode",
        description: "Cannot modify channels in demo mode. Sign up for a free trial!",
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const url = channel ? `/api/channels/${channel.id}` : "/api/channels";
      const method = channel ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          name: formData.name,
          handle: formData.handle || null,
          region: formData.region || null,
          notes: formData.notes || null,
          isActive: formData.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "DEMO_READ_ONLY") {
          toast({
            title: "Demo Mode",
            description: data.error,
            variant: "warning",
          });
          return;
        }
        throw new Error(data.error || "Failed to save channel");
      }

      toast({
        title: channel ? "Channel Updated" : "Channel Created",
        description: `"${formData.name}" has been ${channel ? "updated" : "created"} successfully.`,
        variant: "success",
      });

      onSave();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save channel",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {channel ? "Edit Channel" : "Add Channel"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Demo warning */}
        {isDemo && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <strong>Demo Mode:</strong> Changes cannot be saved.
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1">
              Platform <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              disabled={!!channel}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100"
            >
              <option value="TIKTOK">🎵 TikTok</option>
              <option value="INSTAGRAM">📸 Instagram</option>
              <option value="LINKEDIN">💼 LinkedIn</option>
              <option value="FACEBOOK">👍 Facebook</option>
              <option value="OTHER">📱 Other</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Channel Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., TikTok Toulouse"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Handle */}
          <div>
            <label htmlFor="handle" className="block text-sm font-medium text-slate-700 mb-1">
              Handle / Username
            </label>
            <input
              type="text"
              id="handle"
              name="handle"
              value={formData.handle}
              onChange={handleChange}
              placeholder="e.g., @questhire_toulouse"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Region */}
          <div>
            <label htmlFor="region" className="block text-sm font-medium text-slate-700 mb-1">
              Region
            </label>
            <input
              type="text"
              id="region"
              name="region"
              value={formData.region}
              onChange={handleChange}
              placeholder="e.g., Toulouse, Lyon"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Internal notes about this channel..."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Active toggle (only for edit) */}
          {channel && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="text-sm text-slate-700">
                Channel is active
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isDemo}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : channel ? "Save Changes" : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// CHANNELS LIST COMPONENT
// =============================================================================

export function ChannelsList({ channels, canManage, isDemo }: ChannelsListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const filteredChannels = channels.filter((channel) => {
    if (filter === "active") return channel.isActive;
    if (filter === "inactive") return !channel.isActive;
    return true;
  });

  const handleAddClick = () => {
    if (isDemo) {
      toast({
        title: "Demo Mode",
        description: "Cannot add channels in demo mode. Sign up for a free trial!",
        variant: "warning",
      });
    }
    setEditingChannel(null);
    setShowForm(true);
  };

  const handleEditClick = (channel: Channel) => {
    if (isDemo) {
      toast({
        title: "Demo Mode",
        description: "Cannot edit channels in demo mode. Sign up for a free trial!",
        variant: "warning",
      });
    }
    setEditingChannel(channel);
    setShowForm(true);
  };

  const handleDeactivate = async (channel: Channel) => {
    if (isDemo) {
      toast({
        title: "Demo Mode",
        description: "Cannot deactivate channels in demo mode.",
        variant: "warning",
      });
      return;
    }

    try {
      const response = await fetch(`/api/channels/${channel.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to deactivate channel");
      }

      toast({
        title: "Channel Deactivated",
        description: `"${channel.name}" has been deactivated.`,
        variant: "success",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to deactivate channel",
        variant: "error",
      });
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === "all"
                ? "bg-indigo-100 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({channels.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === "active"
                ? "bg-green-100 text-green-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Active ({channels.filter((c) => c.isActive).length})
          </button>
          <button
            onClick={() => setFilter("inactive")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              filter === "inactive"
                ? "bg-slate-200 text-slate-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Inactive ({channels.filter((c) => !c.isActive).length})
          </button>
        </div>

        {canManage && (
          <button
            onClick={handleAddClick}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Channel
          </button>
        )}
      </div>

      {/* Channels grid */}
      {filteredChannels.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">No channels yet</h3>
          <p className="text-slate-500 mb-4">
            {filter === "all"
              ? "Add your first social media channel to start planning publications."
              : `No ${filter} channels found.`}
          </p>
          {canManage && filter === "all" && (
            <button
              onClick={handleAddClick}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add Channel
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChannels.map((channel) => {
            const config = CHANNEL_TYPE_CONFIG[channel.type];
            return (
              <div
                key={channel.id}
                className={`bg-white rounded-xl border border-slate-200 p-5 ${
                  !channel.isActive ? "opacity-60" : ""
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${config.color}`}
                    >
                      {config.icon}
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-900">{channel.name}</h3>
                      <p className="text-sm text-slate-500">{config.label}</p>
                    </div>
                  </div>
                  {!channel.isActive && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                      Inactive
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm mb-4">
                  {channel.handle && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {channel.handle}
                    </div>
                  )}
                  {channel.region && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {channel.region}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {channel.publicationCount} publication{channel.publicationCount !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Actions */}
                {canManage && (
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleEditClick(channel)}
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Edit
                    </button>
                    {channel.isActive && (
                      <button
                        onClick={() => handleDeactivate(channel)}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <ChannelFormModal
          channel={editingChannel}
          onClose={() => {
            setShowForm(false);
            setEditingChannel(null);
          }}
          onSave={() => router.refresh()}
          isDemo={isDemo}
        />
      )}
    </>
  );
}
