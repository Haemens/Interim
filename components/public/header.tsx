"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b transition-all duration-200",
        isHome 
          ? "border-slate-800 bg-slate-950/80 backdrop-blur-md" 
          : "border-slate-800 bg-slate-950"
      )}
    >
      <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold">I</span>
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">Interim</span>
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <Link href="/product" className="hover:text-white transition-colors">Produit</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Tarifs</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Connexion
          </Link>
          <Link
            href="/signup"
            className="hidden md:inline-flex bg-white text-slate-950 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Essai gratuit
          </Link>
        </div>
      </div>
    </nav>
  );
}
