"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search, MapPin, Briefcase, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function JobFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q")?.toString() || "");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Effect for search debounce
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const currentQ = params.get("q") || "";
    
    if (debouncedSearch !== currentQ) {
      if (debouncedSearch) {
        params.set("q", debouncedSearch);
      } else {
        params.delete("q");
      }
      router.replace(`/jobs?${params.toString()}`, { scroll: false });
    }
  }, [debouncedSearch, router, searchParams]);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`/jobs?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 -mt-8 relative z-10 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search Query */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Rechercher un poste (ex: Maçon, Serveur...)"
            className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Contract Type */}
        <Select
          defaultValue={searchParams.get("type")?.toString() || "ALL"}
          onValueChange={(val) => handleFilterChange("type", val)}
        >
          <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:bg-white">
            <div className="flex items-center gap-2 text-slate-600">
              <Briefcase className="h-4 w-4" />
              <SelectValue placeholder="Type de contrat" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous contrats</SelectItem>
            <SelectItem value="FULL_TIME">CDI</SelectItem>
            <SelectItem value="CONTRACT">CDD</SelectItem>
            <SelectItem value="INTERIM">Intérim</SelectItem>
            <SelectItem value="PART_TIME">Temps partiel</SelectItem>
            <SelectItem value="FREELANCE">Freelance</SelectItem>
            <SelectItem value="INTERNSHIP">Stage</SelectItem>
          </SelectContent>
        </Select>

        {/* Sector (Simplified for demo, ideally dynamic) */}
        <Select
          defaultValue={searchParams.get("sector")?.toString() || "ALL"}
          onValueChange={(val) => handleFilterChange("sector", val)}
        >
          <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:bg-white">
            <div className="flex items-center gap-2 text-slate-600">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Secteur" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous secteurs</SelectItem>
            <SelectItem value="Logistique">Logistique</SelectItem>
            <SelectItem value="BTP">BTP / Construction</SelectItem>
            <SelectItem value="Restauration">Hôtellerie / Restauration</SelectItem>
            <SelectItem value="Commerce">Commerce / Vente</SelectItem>
            <SelectItem value="Transport">Transport</SelectItem>
            <SelectItem value="Services">Services</SelectItem>
            <SelectItem value="Administratif">Administratif</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Active Filters Summary (Optional polish) */}
      {(searchParams.get("q") || searchParams.get("type") || searchParams.get("sector")) && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 animate-in fade-in slide-in-from-top-2">
          <span>Filtres actifs :</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-auto py-1 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            onClick={() => router.replace("/jobs")}
          >
            Réinitialiser tout
          </Button>
        </div>
      )}
    </div>
  );
}
