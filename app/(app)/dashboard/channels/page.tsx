import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { TENANT_HEADER } from "@/lib/tenant";
import { getCurrentUser } from "@/modules/auth";
import { isDemoAgencySlug } from "@/modules/auth/demo-mode";
import { getPlanFeaturesForAgency } from "@/modules/billing/plan-features";
import { ChannelsList } from "./channels-list";

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getMembership(userId: string, agencySlug: string) {
  const membership = await db.membership.findFirst({
    where: {
      user: { id: userId },
      agency: { slug: agencySlug },
    },
    include: {
      agency: true,
    },
  });

  return membership;
}

async function getChannels(agencyId: string) {
  const channels = await db.channel.findMany({
    where: { agencyId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          publications: true,
        },
      },
    },
  });

  return channels;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function ChannelsPage() {
  const headersList = await headers();
  const tenantSlug = headersList.get(TENANT_HEADER);

  if (!tenantSlug) {
    redirect("/login");
  }

  // Get current user
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Get membership
  const membership = await getMembership(user.id, tenantSlug);
  if (!membership) {
    redirect("/login");
  }

  // Get channels
  const channels = await getChannels(membership.agencyId);

  // Get plan features
  const { plan, features } = await getPlanFeaturesForAgency(membership.agencyId);
  const canUseSocialContent = features.canUseSocialContent;
  const maxChannels = features.maxChannels;
  const isAtChannelLimit = maxChannels !== null && channels.length >= maxChannels;

  const canManage = ["ADMIN", "OWNER"].includes(membership.role);
  const isDemo = isDemoAgencySlug(tenantSlug);

  // Serialize channels for client component
  type ChannelType = "TIKTOK" | "INSTAGRAM" | "LINKEDIN" | "FACEBOOK" | "OTHER";
  const serializedChannels = channels.map((channel: {
    id: string;
    type: string;
    name: string;
    handle: string | null;
    region: string | null;
    isActive: boolean;
    notes: string | null;
    _count: { publications: number };
    createdAt: Date;
    updatedAt: Date;
  }) => ({
    id: channel.id,
    type: channel.type as ChannelType,
    name: channel.name,
    handle: channel.handle,
    region: channel.region,
    isActive: channel.isActive,
    notes: channel.notes,
    publicationCount: channel._count.publications,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Channels</h1>
        <p className="text-slate-500 mt-1">
          Manage your social media channels for job publication
        </p>
      </div>

      {/* Plan gating: Show upsell for Starter plan */}
      {!canUseSocialContent && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Unlock Social Content Features</h3>
              <p className="text-white/80 mt-1">
                Upgrade to Pro to generate social media content for your job postings, 
                manage unlimited channels, and track publication performance.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Link
                  href="/dashboard/billing"
                  className="px-4 py-2 bg-white text-indigo-600 font-medium rounded-lg hover:bg-white/90 transition-colors"
                >
                  View Plans
                </Link>
                <span className="text-white/60 text-sm">
                  Currently on {plan} plan
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channel limit warning */}
      {canUseSocialContent && isAtChannelLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-800">Channel limit reached</h3>
              <p className="text-sm text-amber-700 mt-1">
                You&apos;ve reached your limit of {maxChannels} channels. 
                <Link href="/dashboard/billing" className="font-medium underline ml-1">
                  Upgrade your plan
                </Link>
                {" "}for unlimited channels.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info banner */}
      {canUseSocialContent && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800">About Channels</h3>
              <p className="text-sm text-blue-700 mt-1">
                Channels represent your social media accounts (TikTok, Instagram, LinkedIn, etc.). 
                Define them here, then use them to plan and track job publications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Channels list */}
      <ChannelsList
        channels={serializedChannels}
        canManage={canManage && canUseSocialContent && !isAtChannelLimit}
        isDemo={isDemo}
      />
    </div>
  );
}
