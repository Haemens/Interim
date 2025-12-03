"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Send, Users, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "COMPLETED";
  totalRecipientsPlanned: number;
  segmentId?: string;
}

export default function CampaignEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  async function fetchCampaign() {
    try {
      const res = await fetch(`/api/email/campaigns/${id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setCampaign(data.campaign);
      setName(data.campaign.name);
      setSubject(data.campaign.subject);
      setBody(data.campaign.bodyHtml);
      setRecipientCount(data.campaign.totalRecipientsPlanned);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load campaign", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/email/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, bodyHtml: body }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Saved", description: "Campaign updated successfully" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save changes", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePrepare() {
    try {
      const res = await fetch(`/api/email/campaigns/${id}/prepare`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setRecipientCount(data.count);
      toast({ title: "Audience Updated", description: `${data.count} recipients found.` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to calculate audience", variant: "error" });
    }
  }

  async function handleLaunch() {
    if (!confirm("Are you sure you want to launch this campaign?")) return;
    
    setLaunching(true);
    try {
      const res = await fetch(`/api/email/campaigns/${id}/launch`, { method: "POST" });
      if (!res.ok) throw new Error("Launch failed");
      toast({ title: "Launched!", description: "Campaign is now sending." });
      router.push("/dashboard/email-campaigns");
    } catch (e) {
      toast({ title: "Error", description: "Failed to launch campaign", variant: "error" });
    } finally {
      setLaunching(false);
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!campaign) return <div>Not found</div>;

  const isEditable = campaign.status === "DRAFT";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/email-campaigns"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
            <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{campaign.status}</Badge>
                <span className="text-sm text-muted-foreground">Created {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {isEditable && (
                <>
                    <Button variant="outline" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                    </Button>
                    <Button onClick={handleLaunch} disabled={launching || (recipientCount === 0)}>
                        {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Launch Campaign
                    </Button>
                </>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Campaign Name (Internal)</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} disabled={!isEditable} />
                    </div>
                    <div>
                        <Label>Email Subject</Label>
                        <Input value={subject} onChange={e => setSubject(e.target.value)} disabled={!isEditable} />
                    </div>
                    <div>
                        <Label>Email Body</Label>
                        <Textarea 
                            value={body} 
                            onChange={e => setBody(e.target.value)} 
                            rows={12} 
                            className="font-mono text-sm"
                            disabled={!isEditable} 
                        />
                        <p className="text-xs text-muted-foreground mt-2">HTML is supported. You can use {'{{firstName}}'} for variables.</p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Audience</CardTitle>
                    <CardDescription>Who will receive this email?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-secondary/50 p-4 rounded-lg text-center">
                        <div className="text-3xl font-bold">{recipientCount ?? "-"}</div>
                        <div className="text-sm text-muted-foreground">Recipients</div>
                    </div>
                    
                    {isEditable && (
                        <Button variant="secondary" className="w-full" onClick={handlePrepare}>
                            <Users className="w-4 h-4 mr-2" />
                            Recalculate Audience
                        </Button>
                    )}

                    <div className="text-sm text-muted-foreground">
                        <p>Segment: <strong>All Active Candidates</strong></p>
                        <p className="mt-2 text-xs">Targeting filters can be configured in the Segments settings.</p>
                    </div>
                </CardContent>
            </Card>

            {!isEditable && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Read Only</AlertTitle>
                    <AlertDescription>
                        This campaign is {campaign.status.toLowerCase()} and cannot be edited.
                    </AlertDescription>
                </Alert>
            )}
        </div>
      </div>
    </div>
  );
}
