"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Activity } from "lucide-react";
// Types are only imported as types
import type { ActivityAction, ActivityTargetType } from "@/modules/activity";

interface ActivityEvent {
  id: string;
  targetType: ActivityTargetType;
  action: ActivityAction;
  summary: string;
  createdAt: string;
  actor: {
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
  } | null;
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch("/api/activity");
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchActivity();
  }, []);

  const getInitials = (name: string) => (name || "?").substring(0, 2).toUpperCase();

  const getActorName = (actor: ActivityEvent["actor"]) => {
    if (!actor) return "Système";
    if (actor.firstName && actor.lastName) return `${actor.firstName} ${actor.lastName}`;
    return actor.name || "Utilisateur inconnu";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flux d'activité</h1>
          <p className="text-muted-foreground">Suivez les actions de votre équipe en temps réel.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Aucune activité récente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 max-w-3xl mx-auto">
          {activities.map((event) => (
            <div key={event.id} className="flex gap-4 p-4 bg-card rounded-lg border border-border shadow-sm items-start">
              <Avatar className="w-10 h-10 mt-1">
                <AvatarImage src={event.actor?.image || undefined} />
                <AvatarFallback>{getInitials(getActorName(event.actor))}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div>
                    <p className="font-medium text-sm">
                      {getActorName(event.actor)}
                    </p>
                    <p className="text-foreground mt-0.5">{event.summary}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline" className="text-[10px]">{event.targetType}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{event.action}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
