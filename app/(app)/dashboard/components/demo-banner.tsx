"use client";

import Link from "next/link";

interface DemoBannerProps {
  isDemo: boolean;
}

/**
 * Banner shown when viewing the demo agency dashboard
 */
export function DemoBanner({ isDemo }: DemoBannerProps) {
  if (!isDemo) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium">
      <span className="mr-2">🎭</span>
      Vous explorez la version démo de QuestHire. Les changements ne sont pas enregistrés.
      <Link
        href="/signup"
        className="ml-3 underline hover:no-underline font-semibold"
      >
        Commencer l&apos;essai gratuit →
      </Link>
    </div>
  );
}
