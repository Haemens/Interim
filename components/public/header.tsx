"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, Briefcase, Building2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const isJobBoard = pathname.startsWith("/jobs") || pathname.startsWith("/agencies");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/jobs?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Job Board Header
  if (isJobBoard) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          {/* Logo + Main Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Q</span>
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">QuestHire</span>
            </Link>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <Link 
                href="/jobs" 
                className={cn("hover:text-indigo-600 transition-colors flex items-center gap-2", pathname === "/jobs" && "text-indigo-600")}
              >
                Trouver un job
              </Link>
              <Link 
                href="/agencies" 
                className={cn("hover:text-indigo-600 transition-colors", pathname.startsWith("/agencies") && "text-indigo-600")}
              >
                Agences
              </Link>
              <Link href="/how-it-works" className="hover:text-indigo-600 transition-colors">
                Comment ça marche
              </Link>
            </div>
          </div>

          {/* Search Bar - Subtle */}
          <div className="hidden lg:flex flex-1 max-w-md mx-4">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un job, une agence..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 rounded-full text-sm transition-all outline-none placeholder:text-slate-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors hidden sm:block">
              Vous recrutez ?
            </Link>
            <Link href="/login" passHref>
              <Button className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-full px-6">
                Connexion
              </Button>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // Marketing Header
  return (
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b transition-all duration-200",
        isHome 
          ? "bg-white/90 backdrop-blur-md border-transparent shadow-sm" 
          : "bg-white border-slate-200"
      )}
    >
      <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200">
              <span className="text-white font-bold">Q</span>
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">QuestHire</span>
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="/jobs" className="text-indigo-600 hover:text-indigo-700 transition-colors font-semibold flex items-center gap-2">
            <Search className="w-4 h-4" />
            Trouver un job
          </Link>
          <Link href="/product" className="hover:text-indigo-600 transition-colors">Produit</Link>
          <Link href="/pricing" className="hover:text-indigo-600 transition-colors">Tarifs</Link>
        </div>
        <div className="flex items-center gap-4 md:gap-4">
          <Link
            href="/"
            className="hidden md:inline-flex text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            Vous recrutez ?
          </Link>
          <Link href="/login" passHref>
            <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6">
              Connexion
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
