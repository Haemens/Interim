"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, User, Briefcase, Building, Calendar, MapPin, Mail, Phone } from "lucide-react";
import { MissionDetail, MissionStatus } from "@/modules/mission/types";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTIONS: { value: MissionStatus; label: string }[] = [
  { value: "PLANNED", label: "Planifié" },
  { value: "ACTIVE", label: "En cours" },
  { value: "COMPLETED", label: "Terminé" },
  { value: "CANCELLED", label: "Annulé" },
  { value: "NO_SHOW", label: "No Show" },
  { value: "SUSPENDED", label: "Suspendu" },
];

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PLANNED: "secondary",
  ACTIVE: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
  SUSPENDED: "secondary"
};

export default function MissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function fetchMission() {
      try {
        const res = await fetch(`/api/missions/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setMission(data.mission);
        } else {
          toast({ title: "Erreur", description: "Mission introuvable", variant: "destructive" });
          router.push("/dashboard/missions");
        }
      } catch (e) {
        console.error(e);
        toast({ title: "Erreur", description: "Erreur de chargement", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    if (params.id) fetchMission();
  }, [params.id, router, toast]);

  const handleStatusChange = async (newStatus: MissionStatus) => {
    if (!mission) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/missions/${mission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        
        if (data.message) {
             // Demo mode
             toast({ title: "Mode Démo", description: data.message, variant: "default" }); // 'success' variant might not exist in toast, default/destructive usually
             setMission({ ...mission, status: newStatus });
        } else {
             setMission(data.mission);
             toast({ title: "Succès", description: "Statut mis à jour", variant: "default" });
        }
      } else {
        throw new Error("Failed to update");
      }
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8" /></div>;
  }

  if (!mission) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/missions")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mission {mission.candidate.fullName}</h1>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
            <Badge variant={STATUS_COLORS[mission.status] || "outline"}>{mission.status}</Badge>
            <span>•</span>
            <span>{mission.job.title}</span>
          </div>
        </div>
        <div className="ml-auto">
            <Select 
                disabled={isUpdating} 
                value={mission.status} 
                onValueChange={(val) => handleStatusChange(val as MissionStatus)}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Détails de la mission
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase">Début</label>
                            <p className="font-medium">{new Date(mission.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase">Fin Prévue</label>
                            <p className="font-medium">{new Date(mission.endDatePlanned).toLocaleDateString()}</p>
                        </div>
                    </div>
                    
                    {mission.location && (
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase">Lieu</label>
                            <div className="flex items-center gap-2 mt-1">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{mission.location}</span>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase">Notes</label>
                        <p className="text-sm mt-1 whitespace-pre-wrap text-muted-foreground">
                            {mission.notes || "Aucune note"}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Contact sur site
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {mission.siteContactName ? (
                        <div className="space-y-3">
                            <div className="font-medium">{mission.siteContactName}</div>
                            <div className="flex gap-4 text-sm">
                                {mission.siteContactEmail && (
                                    <a href={`mailto:${mission.siteContactEmail}`} className="flex items-center gap-2 hover:underline">
                                        <Mail className="w-4 h-4" /> {mission.siteContactEmail}
                                    </a>
                                )}
                                {mission.siteContactPhone && (
                                    <a href={`tel:${mission.siteContactPhone}`} className="flex items-center gap-2 hover:underline">
                                        <Phone className="w-4 h-4" /> {mission.siteContactPhone}
                                    </a>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Aucun contact spécifié</p>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Candidat</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-medium">{mission.candidate.fullName}</div>
                            {mission.candidate.email && <div className="text-xs text-muted-foreground">{mission.candidate.email}</div>}
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                        <Link href={`/dashboard/candidates/${mission.candidateId}`}>Voir profil</Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Client</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            <Building className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-medium">{mission.client.name}</div>
                            {mission.client.contactName && <div className="text-xs text-muted-foreground">{mission.client.contactName}</div>}
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                        <Link href={`/dashboard/clients/${mission.clientId}`}>Voir fiche client</Link>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Offre</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="font-medium truncate">{mission.job.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">Référence: {mission.jobId.slice(-6)}</div>
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                        <Link href={`/dashboard/jobs/${mission.jobId}`}>Voir l'offre</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
