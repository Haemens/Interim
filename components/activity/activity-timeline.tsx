"use client"
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface ActivityTimelineProps {
  targetType: ActivityTargetType;
  targetId: string;
}

export function ActivityTimeline({ targetType, targetId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`/api/activity?targetType=${targetType}&targetId=${targetId}`);
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
  }, [targetType, targetId]);

  const getInitials = (name: string) => (name || "?").substring(0, 2).toUpperCase();

  const getActorName = (actor: ActivityEvent["actor"]) => {
    if (!actor) return "Système";
    if (actor.firstName && actor.lastName) return `${actor.firstName} ${actor.lastName}`;
    return actor.name || "Utilisateur inconnu";
  };

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }

  if (activities.length === 0) {
    return <div className="text-sm text-muted-foreground text-center p-4">Aucune activité enregistrée.</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((event) => (
        <div key={event.id} className="flex gap-3 items-start">
           <Avatar className="w-8 h-8 mt-0.5">
            <AvatarImage src={event.actor?.image || undefined} />
            <AvatarFallback className="text-xs">{getInitials(getActorName(event.actor))}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
             <div className="flex justify-between items-start">
                <div>
                   <p className="text-sm font-medium">{getActorName(event.actor)}</p>
                   <p className="text-sm text-foreground">{event.summary}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {new Date(event.createdAt).toLocaleDateString()}
                </span>
             </div>
             <div className="mt-1">
                <Badge variant="secondary" className="text-[10px] h-5">{event.action}</Badge>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
}
