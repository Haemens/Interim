"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Briefcase, Building } from "lucide-react";
import { MissionSummary } from "@/modules/mission/types";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PLANNED: "secondary",
  ACTIVE: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
  SUSPENDED: "secondary"
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchMissions() {
      try {
        const res = await fetch("/api/missions");
        if (res.ok) {
          const data = await res.json();
          setMissions(data.missions);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMissions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Missions en cours</h1>
          <p className="text-muted-foreground">Suivez l'activité de vos intérimaires.</p>
        </div>
        {/* Future: Add filters here */}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
      ) : missions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Aucune mission trouvée.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {missions.map((mission) => (
            <Card 
              key={mission.id} 
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50" 
              onClick={() => router.push(`/dashboard/missions/${mission.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={STATUS_COLORS[mission.status] || "outline"}>
                    {mission.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(mission.startDate).toLocaleDateString()}
                  </span>
                </div>
                <CardTitle className="text-lg font-semibold leading-tight">{mission.candidate.fullName}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate font-medium text-foreground/80">{mission.job.title}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{mission.client.name}</span>
                </div>
                {mission.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{mission.location}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
