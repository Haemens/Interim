"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Filter,
  ArrowUpRight
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

// =============================================================================
// TYPES
// =============================================================================

interface Job {
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  status: string;
  createdAt: string;
  _count: {
    applications: number;
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
    case "DRAFT":
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
    case "PAUSED":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "CLOSED":
      return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";
    case "ARCHIVED":
      return "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "Active",
    DRAFT: "Brouillon",
    PAUSED: "En pause",
    CLOSED: "Fermée",
    ARCHIVED: "Archivée",
  };
  return map[status] || status;
}

function translateContractType(type: string | null): string {
  if (!type) return "—";
  const map: Record<string, string> = {
    FULL_TIME: "CDI",
    PART_TIME: "Temps partiel",
    CONTRACT: "CDD",
    FREELANCE: "Freelance",
    INTERNSHIP: "Stage",
    INTERIM: "Intérim",
  };
  return map[type] || type;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs");
        if (!res.ok) {
          throw new Error("Impossible de récupérer les offres");
        }
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, []);

  // Derived state
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch = 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;
      const matchesType = typeFilter === "ALL" || job.contractType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [jobs, searchQuery, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      active: jobs.filter(j => j.status === "ACTIVE").length,
      applications: jobs.reduce((acc, j) => acc + j._count.applications, 0)
    };
  }, [jobs]);

  if (loading) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex justify-between items-center">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-10 w-40 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-destructive flex items-center gap-3">
          <div className="p-2 bg-destructive/20 rounded-full">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold">Erreur de chargement</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Offres d&apos;emploi</h1>
          <p className="text-muted-foreground mt-1">Gérez vos recrutements et suivez les candidatures.</p>
        </div>
        <Link href="/dashboard/jobs/new">
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 transition-all hover:scale-105">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle offre
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50 dark:bg-gradient-to-br dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-400 uppercase tracking-wider">Total Offres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-950 dark:text-blue-100">{stats.total}</div>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">Toutes les offres créées</p>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50 dark:bg-gradient-to-br dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-400 uppercase tracking-wider">Offres Actives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-950 dark:text-emerald-100">{stats.active}</div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Publiées</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-gradient-to-br dark:from-purple-950/40 dark:to-pink-950/40 border border-purple-200 dark:border-purple-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-400 uppercase tracking-wider">Candidatures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-950 dark:text-purple-100">{stats.applications}</div>
            <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">Reçues au total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Toolbar */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par titre, lieu..." 
            className="pl-9 bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-background">
              <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous statuts</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DRAFT">Brouillon</SelectItem>
              <SelectItem value="PAUSED">En pause</SelectItem>
              <SelectItem value="CLOSED">Fermée</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] bg-background">
              <Briefcase className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous types</SelectItem>
              <SelectItem value="FULL_TIME">CDI</SelectItem>
              <SelectItem value="CONTRACT">CDD</SelectItem>
              <SelectItem value="INTERIM">Intérim</SelectItem>
              <SelectItem value="FREELANCE">Freelance</SelectItem>
              <SelectItem value="INTERNSHIP">Stage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Aucune offre trouvée</h3>
          <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
            {jobs.length === 0 
              ? "Commencez par créer votre première offre d'emploi."
              : "Essayez de modifier vos filtres de recherche."}
          </p>
          {jobs.length === 0 && (
            <Link href="/dashboard/jobs/new" className="mt-6">
              <Button>Créer une offre</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[40%] pl-6">Offre</TableHead>
                <TableHead>Type & Lieu</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-center">Candidatures</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6 py-4">
                    <div className="flex flex-col">
                      <Link 
                        href={`/dashboard/jobs/${job.id}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors text-base mb-1 flex items-center gap-2"
                      >
                        {job.title}
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                      </Link>
                      <div className="flex items-center text-xs text-muted-foreground gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(job.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          #{job.id.slice(-4)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center text-sm text-foreground font-medium">
                        <Briefcase className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        {translateContractType(job.contractType)}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        {job.location || "Non spécifié"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`font-normal ${getStatusColor(job.status)}`}
                    >
                      {translateStatus(job.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-medium text-sm">
                      {job._count.applications}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Link href={`/dashboard/jobs/${job.id}`}>
                      <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                        Gérer
                        <ArrowUpRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
