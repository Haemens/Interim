"use client";

// =============================================================================
// TYPES
// =============================================================================

interface SourceItem {
  source: string;
  count: number;
}

interface ChannelItem {
  channelId: string;
  name: string;
  type: string;
  count: number;
}

interface SourcesChartProps {
  bySource: SourceItem[];
  byChannel: ChannelItem[];
  total: number;
}

// =============================================================================
// CHANNEL TYPE ICONS
// =============================================================================

const CHANNEL_ICONS: Record<string, string> = {
  TIKTOK: "🎵",
  INSTAGRAM: "📸",
  FACEBOOK: "📘",
  LINKEDIN: "💼",
  TWITTER: "🐦",
  YOUTUBE: "▶️",
  WEBSITE: "🌐",
  OTHER: "📱",
};

// =============================================================================
// SOURCE LABELS
// =============================================================================

const SOURCE_LABELS: Record<string, string> = {
  job_page: "Job Page",
  channel: "Social Channel",
  email: "Email Campaign",
  qr_code: "QR Code",
  referral: "Referral",
  unknown: "Unknown",
  other: "Other",
};

// =============================================================================
// COMPONENT
// =============================================================================

export function SourcesChart({ bySource, byChannel, total }: SourcesChartProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Applications by Source */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Applications by Source</h3>
        
        {bySource.length === 0 ? (
          <p className="text-slate-500 text-sm">No source data available.</p>
        ) : (
          <div className="space-y-3">
            {bySource.map(({ source, count }) => {
              const percentage = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={source}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">
                      {SOURCE_LABELS[source] || source}
                    </span>
                    <span className="text-slate-500">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Applications by Channel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Top Channels</h3>
        
        {byChannel.length === 0 ? (
          <p className="text-slate-500 text-sm">No channel data available.</p>
        ) : (
          <div className="space-y-3">
            {byChannel.slice(0, 5).map(({ channelId, name, type, count }) => {
              const percentage = total > 0 ? (count / total) * 100 : 0;
              const icon = CHANNEL_ICONS[type] || CHANNEL_ICONS.OTHER;
              return (
                <div key={channelId} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-700 truncate">{name}</span>
                      <span className="text-slate-500 ml-2">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
