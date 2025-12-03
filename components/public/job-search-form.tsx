"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, FormEvent } from "react";
import { Search, MapPin, Briefcase, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function JobSearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [type, setType] = useState(searchParams.get("type") || "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (location) params.set("location", location);
    if (type) params.set("type", type);
    
    router.push(`/jobs?${params.toString()}`);
  };

  const filterPills = [
    { label: "Logement fourni", count: 12 },
    { label: "Nuit", count: 8 },
    { label: "Week-end", count: 24 },
    { label: "Télétravail possible", count: 5 },
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-4 md:p-6 relative z-10 text-left">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
          {/* Keyword Input */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              name="q" 
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Métier, mot-clé ou entreprise" 
              className="pl-10 h-12 text-base border-slate-200 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-500"
            />
          </div>

          {/* Location Input */}
          <div className="md:col-span-3 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              name="location" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ville ou code postal" 
              className="pl-10 h-12 text-base border-slate-200 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-500"
            />
          </div>

          {/* Job Type Select */}
          <div className="md:col-span-3">
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <select 
                name="type" 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-12 pl-10 pr-4 appearance-none bg-slate-50 border border-slate-200 rounded-md text-base text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer placeholder:text-slate-500"
              >
                <option value="">Tous types</option>
                <option value="INTERIM">Intérim</option>
                <option value="CONTRACT">CDD</option>
                <option value="FULL_TIME">CDI</option>
              </select>
            </div>
          </div>

          {/* Search Button */}
          <div className="md:col-span-2">
            <Button type="submit" className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5">
              Rechercher
            </Button>
          </div>
        </div>

        {/* Secondary Filters - Just visual for now or could trigger param updates */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {filterPills.map((pill, idx) => (
            <button 
              key={idx}
              type="button" 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50 text-sm font-medium text-slate-600 transition-colors whitespace-nowrap"
            >
              {pill.label}
              <span className="bg-slate-100 text-slate-500 text-xs px-1.5 py-0.5 rounded-full">{pill.count}</span>
            </button>
          ))}
          <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
          <button type="button" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 whitespace-nowrap">
            <Filter className="w-4 h-4" />
            Tous les filtres
          </button>
        </div>
      </form>
    </div>
  );
}
