"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, Briefcase, Building2, HelpCircle, ChevronDown, User, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isEmployerPage = pathname.startsWith("/employeur") || pathname.startsWith("/product") || pathname.startsWith("/pricing");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLoginMenu, setShowLoginMenu] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 h-16"
      )}
    >
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
              href="/" 
              className={cn("hover:text-indigo-600 transition-colors flex items-center gap-2", pathname === "/" && "text-indigo-600")}
            >
              Trouver un job
            </Link>
            <Link 
              href="/employeur" 
              className={cn("hover:text-indigo-600 transition-colors", isEmployerPage && "text-indigo-600")}
            >
              Agences
            </Link>
          </div>
        </div>

        {/* Search Bar - Only on job board pages */}
        {!isEmployerPage && (
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
        )}

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {!isEmployerPage && (
            <Link href="/employeur" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors hidden sm:block">
              Vous recrutez ?
            </Link>
          )}
          
          <div className="relative">
            <Button 
              className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-full px-6 flex items-center gap-2"
              onClick={() => setShowLoginMenu(!showLoginMenu)}
            >
              Connexion
              <ChevronDown className="w-4 h-4" />
            </Button>

            {showLoginMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowLoginMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Espace</span>
                  </div>
                  <Link 
                    href="/login?type=candidate" 
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                    onClick={() => setShowLoginMenu(false)}
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Candidat</div>
                      <div className="text-xs text-slate-400 font-normal">Gérez vos candidatures</div>
                    </div>
                  </Link>
                  <Link 
                    href="/login?type=recruiter" 
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                    onClick={() => setShowLoginMenu(false)}
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Recruteur</div>
                      <div className="text-xs text-slate-400 font-normal">Publiez vos offres</div>
                    </div>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
