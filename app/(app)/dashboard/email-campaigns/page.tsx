"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Mail } from "lucide-react";
import { EmailCampaignSummary } from "@/modules/email-campaign/types";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SCHEDULED: "default",
  SENDING: "default",
  PAUSED: "destructive",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await fetch("/api/email/campaigns");
        if (res.ok) {
          const data = await res.json();
          setCampaigns(data.campaigns);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCampaigns();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campagnes Email</h1>
          <p className="text-muted-foreground">Mobilisez votre vivier de candidats.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/email-campaigns/new">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle campagne
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Aucune campagne</h3>
              <p className="text-muted-foreground">Créez votre première campagne pour contacter vos candidats.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/email-campaigns/new">Créer une campagne</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-all">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">{campaign.name}</span>
                    <Badge variant={STATUS_COLORS[campaign.status] || "outline"}>{campaign.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    {campaign.job && (
                      <span className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded text-xs">
                        Offre: {campaign.job.title}
                      </span>
                    )}
                    <span>•</span>
                    <span>Créée le {new Date(campaign.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-8 w-full md:w-auto">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{campaign.totalRecipientsPlanned}</div>
                    <div className="text-xs text-muted-foreground uppercase">Destinataires</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                        {campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0}%
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">Taux d&apos;ouverture</div>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/email-campaigns/${campaign.id}`}>Gérer</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
