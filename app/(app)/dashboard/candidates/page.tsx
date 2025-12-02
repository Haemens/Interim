"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, MapPin, Mail } from "lucide-react";

interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  status: "ACTIVE" | "DO_NOT_CONTACT" | "BLACKLISTED";
  lastAppliedAt: string;
  sectors: string[];
  skills: string[];
  applicationsCount: number;
}

interface CandidatesResponse {
  items: Candidate[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

function getStatusVariant(status: Candidate["status"]) {
  switch (status) {
    case "ACTIVE":
      return "default"; // Indigo
    case "DO_NOT_CONTACT":
      return "secondary"; // Yellowish/Gray
    case "BLACKLISTED":
      return "destructive"; // Red
    default:
      return "outline";
  }
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sectorFilter, setSectorFilter] = useState("");

  useEffect(() => {
    async function fetchCandidates() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (search) params.set("q", search);
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (sectorFilter) params.set("sector", sectorFilter);

        const res = await fetch(`/api/candidates?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch candidates");
        }

        const data: CandidatesResponse = await res.json();
        setCandidates(data.items);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load candidates");
      } finally {
        setLoading(false);
      }
    }

    const debounce = setTimeout(fetchCandidates, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter, sectorFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Talent Pool"
        description="Browse and manage your candidate profiles."
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, email, location, skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DO_NOT_CONTACT">Do Not Contact</SelectItem>
                  <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sector Filter */}
            <div className="w-full md:w-64 relative">
              <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Filter by sector..."
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground font-medium">
        {loading ? "Loading..." : `${total} candidate${total !== 1 ? "s" : ""} found`}
      </div>

      {/* Candidates Table */}
      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sectors</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead className="text-right">Applications</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading candidates...
                  </TableCell>
                </TableRow>
              ) : candidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No candidates found. Candidates are created automatically when someone applies to a job.
                  </TableCell>
                </TableRow>
              ) : (
                candidates.map((candidate) => (
                  <TableRow
                    key={candidate.id}
                    className="group cursor-pointer hover:bg-muted/50"
                    onClick={() => (window.location.href = `/dashboard/candidates/${candidate.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <Link
                          href={`/dashboard/candidates/${candidate.id}`}
                          className="text-foreground hover:text-primary transition-colors font-semibold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {candidate.fullName}
                        </Link>
                        {candidate.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {candidate.location}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="w-3.5 h-3.5" />
                        {candidate.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(candidate.status)} className="font-normal text-[10px] px-2">
                        {candidate.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {candidate.sectors.slice(0, 2).map((sector) => (
                          <Badge
                            key={sector}
                            variant="outline"
                            className="text-[10px] font-normal bg-blue-50/50 text-blue-700 border-blue-100"
                          >
                            {sector}
                          </Badge>
                        ))}
                        {candidate.sectors.length > 2 && (
                          <span className="text-xs text-muted-foreground pl-1">
                            +{candidate.sectors.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 2).map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="text-[10px] font-normal"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills.length > 2 && (
                          <span className="text-xs text-muted-foreground pl-1">
                            +{candidate.skills.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="font-medium">
                        {candidate.applicationsCount}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
