"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  Loader2, 
  Wand2, 
  Copy, 
  Check, 
  Calendar, 
  Edit2, 
  Eye, 
  AlertCircle, 
  Share2,
  X,
  Plus,
  Link2,
  RefreshCw,
  Sparkles,
  MessageSquare
} from "lucide-react";
import { ConnectSocialModal } from "../../components/connect-social-modal";

// =============================================================================
// TYPES
// =============================================================================

type ContentVariant = "TIKTOK_SCRIPT" | "INSTAGRAM_CAPTION" | "LINKEDIN_POST" | "FACEBOOK_POST" | "WHATSAPP_MESSAGE" | "GENERIC_SNIPPET";
type ContentStatus = "DRAFT" | "APPROVED" | "ARCHIVED";
type PublicationStatus = "DRAFT" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED";
type ChannelType = "TIKTOK" | "INSTAGRAM" | "LINKEDIN" | "FACEBOOK" | "OTHER";

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
}

interface Content {
  id: string;
  variant: ContentVariant;
  title: string | null;
  body: string;
  suggestedHashtags: string | null;
  status: ContentStatus;
  language: string | null;
  generatedAt: string | null;
  approvedAt: string | null;
  lastEditedAt: string | null;
  createdAt: string;
  createdBy: UserInfo | null;
  lastEditedBy: UserInfo | null;
  _count: {
    publications: number;
  };
}

interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  handle: string | null;
  region: string | null;
}

interface Publication {
  id: string;
  status: PublicationStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  channel: Channel;
  content: {
    id: string;
    variant: ContentVariant;
    title: string | null;
    status: ContentStatus;
  };
}

interface SocialContentProps {
  jobId: string;
  isDemo: boolean;
  canEdit: boolean;
  canUseAi?: boolean;
  canAutoPublish?: boolean;
}

type AiTone = "default" | "friendly" | "formal" | "punchy";

// =============================================================================
// MOCK DATA FOR DEMO MODE
// =============================================================================

const getMockContents = (jobId: string): Content[] => [
  {
    id: `mock-tiktok-${jobId}`,
    variant: "TIKTOK_SCRIPT",
    title: "Une journée type",
    body: "[SCÈNE 1]\nL'écran affiche \"Tu cherches un job ?\" avec une musique dynamique.\n\n[SCÈNE 2]\nOn voit un bureau moderne. Texte : \"Rejoins notre équipe comme Chef de Projet !\"\n\n[SCÈNE 3]\nListe à puces apparaît :\n✅ Gestion d'équipe\n✅ Projets innovants\n✅ Ambiance top\n\n[CALL TO ACTION]\nLien en bio pour postuler ! 🔥 #Job #Recrutement",
    suggestedHashtags: "#Recrutement #JobAlert #Carrière",
    status: "DRAFT",
    language: "fr",
    generatedAt: new Date().toISOString(),
    approvedAt: null,
    lastEditedAt: null,
    createdAt: new Date().toISOString(),
    createdBy: null,
    lastEditedBy: null,
    _count: { publications: 0 }
  },
  {
    id: `mock-linkedin-${jobId}`,
    variant: "LINKEDIN_POST",
    title: "Annonce Professionnelle",
    body: "🚀 Nous recrutons !\n\nVous êtes passionné par la gestion de projet et vous cherchez un nouveau défi ?\n\nNous recherchons un Chef de Projet talentueux pour rejoindre notre équipe dynamique.\n\nVos missions :\n🔹 Piloter des projets stratégiques\n🔹 Coordonner les équipes\n🔹 Assurer la satisfaction client\n\nPourquoi nous rejoindre ?\n✨ Une culture d'entreprise forte\n✨ Des opportunités d'évolution\n✨ Un package attractif\n\nIntéressé(e) ? Postulez dès maintenant via le lien en commentaire ! 👇\n\n#Emploi #Recrutement #ChefDeProjet #Opportunité",
    suggestedHashtags: "#Emploi #Recrutement #ChefDeProjet #Carrière",
    status: "DRAFT",
    language: "fr",
    generatedAt: new Date().toISOString(),
    approvedAt: null,
    lastEditedAt: null,
    createdAt: new Date().toISOString(),
    createdBy: null,
    lastEditedBy: null,
    _count: { publications: 0 }
  },
  {
    id: `mock-instagram-${jobId}`,
    variant: "INSTAGRAM_CAPTION",
    title: "Post Lifestyle",
    body: "Nouveau challenge en vue ! 👀\n\nTu as l'âme d'un leader et tu aimes quand ça bouge ? On a le job qu'il te faut !\n\nOn cherche notre futur(e) Chef de Projet. 🎯\n\nSi tu te reconnais :\n⚡ Organisé(e)\n⚡ Créatif(ve)\n⚡ Esprit d'équipe\n\nAlors glisse dans nos DMs ou clique sur le lien en bio pour postuler ! 📲\n\n#JobSearch #Hiring #LifeAtWork #NewJob",
    suggestedHashtags: "#JobSearch #Hiring #LifeAtWork #NewJob",
    status: "DRAFT",
    language: "fr",
    generatedAt: new Date().toISOString(),
    approvedAt: null,
    lastEditedAt: null,
    createdAt: new Date().toISOString(),
    createdBy: null,
    lastEditedBy: null,
    _count: { publications: 0 }
  },
   {
    id: `mock-facebook-${jobId}`,
    variant: "FACEBOOK_POST",
    title: "Annonce Communautaire",
    body: "👋 Bonjour à tous !\n\nNous agrandissons l'équipe et nous sommes à la recherche d'un Chef de Projet motivé(e) pour nous accompagner dans notre croissance.\n\n📍 Poste basé à Paris (ou Télétravail possible)\n💼 CDI - Temps plein\n\nVous connaissez quelqu'un qui correspondrait au profil ? Taguez-le en commentaire ! 👥\n\nPour postuler, c'est par ici 👉 [Lien]\n\nMerci pour vos partages ! 🙏",
    suggestedHashtags: "#Recrutement #Emploi #Paris #Job",
    status: "DRAFT",
    language: "fr",
    generatedAt: new Date().toISOString(),
    approvedAt: null,
    lastEditedAt: null,
    createdAt: new Date().toISOString(),
    createdBy: null,
    lastEditedBy: null,
    _count: { publications: 0 }
  },
  {
    id: `mock-whatsapp-${jobId}`,
    variant: "WHATSAPP_MESSAGE",
    title: "Message Direct",
    body: "Salut ! 👋\n\nJe voulais te partager une super opportunité de job chez nous. On cherche un Chef de Projet et j'ai pensé à toi (ou à quelqu'un de ton réseau) !\n\nC'est un poste clé avec pas mal de responsabilités et une super ambiance. 🚀\n\nTu peux regarder les détails ici : [Lien]\n\nN'hésite pas à faire tourner ! Merci ! 😉",
    suggestedHashtags: null,
    status: "DRAFT",
    language: "fr",
    generatedAt: new Date().toISOString(),
    approvedAt: null,
    lastEditedAt: null,
    createdAt: new Date().toISOString(),
    createdBy: null,
    lastEditedBy: null,
    _count: { publications: 0 }
  }
];

// =============================================================================
// HELPERS
// =============================================================================

const VARIANT_CONFIG: Record<ContentVariant, { label: string; icon: string; color: string }> = {
  TIKTOK_SCRIPT: { label: "Script TikTok", icon: "🎵", color: "bg-black text-white" },
  INSTAGRAM_CAPTION: { label: "Légende Instagram", icon: "📸", color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white" },
  LINKEDIN_POST: { label: "Post LinkedIn", icon: "💼", color: "bg-blue-700 text-white" },
  FACEBOOK_POST: { label: "Post Facebook", icon: "👥", color: "bg-blue-600 text-white" },
  WHATSAPP_MESSAGE: { label: "Message WhatsApp", icon: "💬", color: "bg-green-500 text-white" },
  GENERIC_SNIPPET: { label: "Texte générique", icon: "📝", color: "bg-slate-500 text-white" },
};

const CHANNEL_TYPE_ICON: Record<ChannelType, string> = {
  TIKTOK: "🎵",
  INSTAGRAM: "📸",
  LINKEDIN: "💼",
  FACEBOOK: "👍",
  OTHER: "📱",
};

const STATUS_CONFIG: Record<ContentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Brouillon", variant: "secondary" },
  APPROVED: { label: "Approuvé", variant: "default" },
  ARCHIVED: { label: "Archivé", variant: "outline" },
};

const PUB_STATUS_CONFIG: Record<PublicationStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; dotColor: string }> = {
  DRAFT: { label: "Brouillon", variant: "secondary", dotColor: "bg-slate-400" },
  SCHEDULED: { label: "Planifié", variant: "default", dotColor: "bg-blue-500" },
  PUBLISHING: { label: "Publication...", variant: "secondary", dotColor: "bg-amber-500" },
  PUBLISHED: { label: "Publié", variant: "default", dotColor: "bg-green-500" },
  FAILED: { label: "Échec", variant: "destructive", dotColor: "bg-red-500" },
};

// =============================================================================
// CONTENT EDIT MODAL
// =============================================================================

interface ContentEditModalProps {
  content: Content;
  jobId: string;
  onClose: () => void;
  onSave: (updated: Content) => void;
  isDemo: boolean;
  canEdit: boolean;
}

function ContentEditModal({ content, jobId, onClose, onSave, isDemo, canEdit }: ContentEditModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(content.title || "");
  const [body, setBody] = useState(content.body);
  const [hashtags, setHashtags] = useState(content.suggestedHashtags || "");
  const [status, setStatus] = useState<ContentStatus>(content.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim()) {
      toast({ title: "Erreur", description: "Le contenu est requis", variant: "error" });
      return;
    }

    setIsSubmitting(true);

    if (isDemo) {
      // Simulate API call delay
      setTimeout(() => {
        const updatedContent: Content = {
          ...content,
          title: title.trim() || null,
          body: body.trim(),
          suggestedHashtags: hashtags.trim() || null,
          status,
          lastEditedAt: new Date().toISOString(),
        };
        
        toast({
          title: "Contenu mis à jour (Démo)",
          description: "Vos modifications ont été enregistrées localement.",
          variant: "success",
        });
        
        onSave(updatedContent);
        onClose();
        setIsSubmitting(false);
      }, 800);
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: content.id,
          title: title.trim() || null,
          body: body.trim(),
          suggestedHashtags: hashtags.trim() || null,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "DEMO_READ_ONLY") {
          // Fallback if logic slips through, but isDemo check above handles it
          toast({ title: "Mode Démo", description: "Créez votre agence pour modifier le contenu.", variant: "warning" });
          return;
        }
        if (data.code === "INVALID_STATUS_TRANSITION") {
          toast({ title: "Transition invalide", description: data.error, variant: "error" });
          return;
        }
        throw new Error(data.error || "Échec de la mise à jour");
      }

      toast({
        title: "Contenu mis à jour",
        description: status !== content.status 
          ? `Statut changé en ${STATUS_CONFIG[status].label}`
          : "Vos modifications ont été enregistrées.",
        variant: "success",
      });

      onSave(data.content);
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de la mise à jour",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const config = VARIANT_CONFIG[content.variant];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0 bg-secondary/30">
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${config.color} shadow-sm`}>
              {config.icon}
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Modifier {config.label}</h2>
              <p className="text-xs text-muted-foreground">
                {content.generatedAt && `Généré le ${new Date(content.generatedAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Demo Info */}
        {isDemo && (
          <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex-shrink-0 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span><strong>Mode Démo:</strong> Vous pouvez modifier librement ce contenu pour tester l'interface.</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Titre (optionnel)
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit}
                placeholder="Titre personnalisé..."
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Contenu <span className="text-destructive">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={!canEdit}
                rows={10}
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input bg-background font-mono text-sm resize-none"
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Hashtags suggérés
              </label>
              <Input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                disabled={!canEdit}
                placeholder="#recrutement #emploi #job"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Statut
              </label>
              <div className="flex items-center gap-3">
                {(["DRAFT", "APPROVED", "ARCHIVED"] as ContentStatus[]).map((s) => (
                  <label
                    key={s}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer transition-all",
                      status === s
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-input hover:border-primary/50",
                      !canEdit && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s}
                      checked={status === s}
                      onChange={() => setStatus(s)}
                      disabled={!canEdit}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">
                      {STATUS_CONFIG[s].label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0 bg-secondary/30">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            {canEdit && (
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

// =============================================================================
// PLAN PUBLICATION MODAL
// =============================================================================

interface PlanPublicationModalProps {
  content: Content | null;
  contentId?: string;
  channelId?: string;
  jobId: string;
  channels: Channel[];
  onClose: () => void;
  onSave: () => void;
  isDemo: boolean;
}

function PlanPublicationModal({ content, contentId, channelId, jobId, channels, onClose, onSave, isDemo }: PlanPublicationModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState(channelId || "");
  const [scheduledAt, setScheduledAt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalContentId = content?.id || contentId;
    if (!finalContentId || !selectedChannelId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un canal", variant: "error" });
      return;
    }

    setIsSubmitting(true);

    if (isDemo) {
       setTimeout(() => {
        toast({
          title: "Planification simulée (Mode Démo)",
          description: "Cette fonctionnalité est simulée en mode démo.",
          variant: "success",
        });
        onSave();
        onClose();
        setIsSubmitting(false);
      }, 1000);
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/publications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: finalContentId,
          channelId: selectedChannelId,
          scheduledAt: scheduledAt || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "DEMO_READ_ONLY") {
          toast({ title: "Mode Démo", description: "Créez votre agence pour planifier des publications.", variant: "warning" });
          return;
        }
        throw new Error(data.error || "Échec de la planification");
      }

      toast({
        title: "Publication planifiée",
        description: "Le contenu a été planifié pour publication.",
        variant: "success",
      });

      onSave();
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de la planification",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Planifier la Publication</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {content && (
            <div className="p-3 bg-secondary/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{VARIANT_CONFIG[content.variant].label}</span>
                {content.title && ` - ${content.title}`}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Canal <span className="text-destructive">*</span>
            </label>
            <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un canal..." />
              </SelectTrigger>
              <SelectContent>
                {channels.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id}>
                    {CHANNEL_TYPE_ICON[ch.type]} {ch.name} {ch.handle && `(${ch.handle})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Date de publication (optionnel)
            </label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Laissez vide pour publier maintenant ou sauvegarder en brouillon.</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Planification...
                </>
              ) : (
                "Planifier"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// =============================================================================
// PUBLICATION EDIT MODAL
// =============================================================================

interface PublicationEditModalProps {
  publication: Publication;
  jobId: string;
  onClose: () => void;
  onSave: () => void;
  isDemo: boolean;
  canEdit: boolean;
}

function PublicationEditModal({ publication, jobId, onClose, onSave, isDemo, canEdit }: PublicationEditModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<PublicationStatus>(publication.status);
  const [externalUrl, setExternalUrl] = useState(publication.externalUrl || "");
  const [errorMessage, setErrorMessage] = useState(publication.errorMessage || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    if (isDemo) {
      setTimeout(() => {
        toast({
          title: "Modification simulée (Mode Démo)",
          description: "Les modifications de publication ne sont pas persistées en démo.",
          variant: "success",
        });
        onSave();
        onClose();
        setIsSubmitting(false);
      }, 800);
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/publications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: publication.id,
          status,
          externalUrl: externalUrl.trim() || null,
          errorMessage: status === "FAILED" ? errorMessage.trim() || null : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "DEMO_READ_ONLY") {
          toast({ title: "Mode Démo", description: "Créez votre agence pour modifier la publication.", variant: "warning" });
          return;
        }
        throw new Error(data.error || "Échec de la mise à jour");
      }

      toast({
        title: "Publication mise à jour",
        description: `Statut changé en ${PUB_STATUS_CONFIG[status].label}`,
        variant: "success",
      });

      onSave();
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de la mise à jour",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Modifier la Publication</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="p-3 bg-secondary/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{publication.channel.name}</span>
              {" → "}
              {VARIANT_CONFIG[publication.content.variant]?.label || publication.content.variant}
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Statut</label>
            <div className="flex flex-wrap gap-2">
              {(["DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"] as PublicationStatus[]).map((s) => (
                <label
                  key={s}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all",
                    status === s
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-input hover:border-primary/50",
                    !canEdit && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <input
                    type="radio"
                    name="pubStatus"
                    value={s}
                    checked={status === s}
                    onChange={() => setStatus(s)}
                    disabled={!canEdit}
                    className="sr-only"
                  />
                  <span className={`w-2 h-2 rounded-full ${PUB_STATUS_CONFIG[s].dotColor}`} />
                  <span className="text-sm font-medium">{PUB_STATUS_CONFIG[s].label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* External URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              URL du post {status === "PUBLISHED" && <span className="text-muted-foreground font-normal">(optionnel)</span>}
            </label>
            <Input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              disabled={!canEdit}
              placeholder="https://..."
            />
          </div>

          {/* Error message (only for FAILED) */}
          {status === "FAILED" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Message d&apos;erreur
              </label>
              <textarea
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
                disabled={!canEdit}
                rows={2}
                placeholder="Raison de l'échec..."
                className="w-full px-4 py-3 border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input bg-background text-sm resize-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            {canEdit && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

// =============================================================================
// CAMPAIGN MATRIX
// =============================================================================

interface CampaignMatrixProps {
  jobId: string;
  contents: Content[];
  channels: Channel[];
  publications: Publication[];
  onPlanClick: (contentId: string, channelId: string) => void;
  onPublicationClick: (publication: Publication) => void;
  onCopyLink: (channel: Channel) => void;
  canEdit: boolean;
}

function CampaignMatrix({ jobId, contents, channels, publications, onPlanClick, onPublicationClick, onCopyLink, canEdit }: CampaignMatrixProps) {
  const pubMap = new Map<string, Map<string, Publication>>();
  publications.forEach((pub) => {
    if (!pubMap.has(pub.content.id)) {
      pubMap.set(pub.content.id, new Map());
    }
    pubMap.get(pub.content.id)!.set(pub.channel.id, pub);
  });

  const activeContents = contents.filter((c) => c.status !== "ARCHIVED");

  if (activeContents.length === 0 || channels.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden border-none shadow-md">
      <CardHeader className="px-6 py-4 border-b border-border bg-secondary/20">
        <CardTitle className="text-base font-semibold">Matrice de Campagne</CardTitle>
        <p className="text-sm text-muted-foreground">Suivez le contenu planifié ou publié sur chaque canal</p>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary/30">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase sticky left-0 bg-secondary/30 z-10 border-b border-border">
                Contenu
              </th>
              {channels.map((channel) => (
                <th key={channel.id} className="px-6 py-4 text-center text-xs font-medium text-muted-foreground uppercase min-w-[160px] border-b border-border">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xl">{CHANNEL_TYPE_ICON[channel.type]}</span>
                    <span className="truncate max-w-[120px] font-semibold text-foreground">{channel.name}</span>
                    <button
                      onClick={() => onCopyLink(channel)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary bg-primary/10 rounded hover:bg-primary/20 transition-colors"
                      title="Copier le lien de candidature"
                    >
                      <Share2 className="w-3 h-3" />
                      Lien
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {activeContents.map((content) => {
              const config = VARIANT_CONFIG[content.variant];
              const contentPubs = pubMap.get(content.id);

              return (
                <tr key={content.id} className="hover:bg-secondary/10 transition-colors">
                  <td className="px-6 py-4 sticky left-0 bg-background z-10 border-r border-border/50 group-hover:bg-secondary/10">
                    <div className="flex items-center gap-3">
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${config.color} shadow-sm`}>
                        {config.icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{config.label}</p>
                        <Badge variant={STATUS_CONFIG[content.status].variant} className="mt-1 text-[10px] h-5 px-1.5">
                          {STATUS_CONFIG[content.status].label}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  {channels.map((channel) => {
                    const pub = contentPubs?.get(channel.id);

                    return (
                      <td key={channel.id} className="px-6 py-4 text-center">
                        {pub ? (
                          <Badge
                            variant="outline"
                            onClick={() => onPublicationClick(pub)}
                            className={cn(
                              "cursor-pointer hover:opacity-80 transition-opacity px-2 py-1 h-auto text-xs font-medium gap-1.5 border-transparent",
                              PUB_STATUS_CONFIG[pub.status].variant === "default" && "bg-primary/15 text-primary",
                              PUB_STATUS_CONFIG[pub.status].variant === "secondary" && "bg-secondary text-secondary-foreground",
                              PUB_STATUS_CONFIG[pub.status].variant === "destructive" && "bg-destructive/15 text-destructive"
                            )}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${PUB_STATUS_CONFIG[pub.status].dotColor}`} />
                            {PUB_STATUS_CONFIG[pub.status].label}
                          </Badge>
                        ) : canEdit ? (
                          <button
                            onClick={() => onPlanClick(content.id, channel.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-primary hover:text-primary transition-all hover:scale-110"
                            title="Planifier une publication"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SocialContentSection({ jobId, isDemo, canEdit, canUseAi = false, canAutoPublish = false }: SocialContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [contents, setContents] = useState<Content[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTone, setAiTone] = useState<AiTone>("default");
  const [aiLanguage, setAiLanguage] = useState("fr");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  
  // Modal states
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [planningContent, setPlanningContent] = useState<Content | null>(null);
  const [planningForMatrix, setPlanningForMatrix] = useState<{ contentId: string; channelId: string } | null>(null);
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [contentsRes, pubsRes] = await Promise.all([
        fetch(`/api/jobs/${jobId}/content`, { cache: 'no-store' }),
        fetch(`/api/jobs/${jobId}/publications`, { cache: 'no-store' }),
      ]);

      if (contentsRes.ok) {
        const data = await contentsRes.json();
        setContents(data.contents || []);
      }

      if (pubsRes.ok) {
        const data = await pubsRes.json();
        setPublications(data.publications || []);
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error("Failed to fetch social content data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const handleGenerate = async () => {
    setIsGenerating(true);

    if (isDemo) {
      setTimeout(() => {
        setContents(getMockContents(jobId));
        toast({
          title: "Génération simulée (Mode Démo)",
          description: "5 variantes de contenu ont été générées pour vous tester l'interface.",
          variant: "success",
        });
        setIsGenerating(false);
      }, 1500);
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/content/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "fr" }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "DEMO_READ_ONLY") {
          toast({ title: "Mode Démo", description: "Vous êtes en mode démo. Créez votre agence pour générer du contenu.", variant: "warning" });
          return;
        }
        throw new Error(data.error || "Échec de la génération");
      }

      toast({
        title: "Contenu généré",
        description: `${data.contents.length} variantes de contenu générées.`,
        variant: "success",
      });

      await fetchData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de la génération",
        variant: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (content: Content) => {
    const text = content.body + (content.suggestedHashtags ? `\n\n${content.suggestedHashtags}` : "");
    await navigator.clipboard.writeText(text);
    setCopiedId(content.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copié !", description: "Contenu copié dans le presse-papier.", variant: "success" });
  };

  const handleContentUpdate = (updated: Content) => {
    setContents((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleCopyApplyLink = async (channel: Channel) => {
    const sourceDetail = `${channel.type.toLowerCase()}_${channel.name.toLowerCase().replace(/\s+/g, "_")}`;
    const params = new URLSearchParams({
      source: "channel",
      sourceDetail,
      channelId: channel.id,
    });
    
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const applyUrl = `${baseUrl}/jobs/${jobId}?${params.toString()}`;
    
    await navigator.clipboard.writeText(applyUrl);
    toast({
      title: "Lien copié !",
      description: `Lien pour ${channel.name} copié.`,
      variant: "success",
    });
  };

  const handleGenerateWithAi = async () => {
    if (!canUseAi && !isDemo) {
      toast({
        title: "Mise à niveau requise",
        description: "La génération IA nécessite un plan Pro ou Agency Plus.",
        variant: "warning",
      });
      return;
    }

    setIsGeneratingAi(true);
    setShowAiModal(false);

    if (isDemo) {
      setTimeout(() => {
        setContents(getMockContents(jobId));
        toast({
          title: "Contenu IA généré (Démo)",
          description: "Contenu généré avec l'IA (simulé).",
          variant: "success",
        });
        setIsGeneratingAi(false);
      }, 2000);
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/content/generate/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone: aiTone, language: aiLanguage }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "DEMO_READ_ONLY") {
          toast({ title: "Mode Démo", description: data.error, variant: "warning" });
          return;
        }
        if (data.code === "PLAN_LIMIT") {
          toast({ title: "Mise à niveau requise", description: data.error, variant: "warning" });
          return;
        }
        throw new Error(data.error || "Échec de la génération IA");
      }

      toast({
        title: data.usedAi ? "Contenu IA généré" : "Contenu généré",
        description: data.message,
        variant: "success",
      });

      await fetchData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de la génération",
        variant: "error",
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleRegenerateWithAi = async (contentId: string) => {
    if (!canUseAi && !isDemo) {
      toast({
        title: "Mise à niveau requise",
        description: "La régénération IA nécessite un plan Pro.",
        variant: "warning",
      });
      return;
    }

    setRegeneratingId(contentId);

    if (isDemo) {
      setTimeout(() => {
        setContents(prev => prev.map(c => {
          if (c.id === contentId) {
            return {
              ...c,
              body: c.body + "\n\n(Version régénérée par l'IA 🔄)",
              lastEditedAt: new Date().toISOString()
            };
          }
          return c;
        }));
        
        toast({
          title: "Contenu régénéré (Démo)",
          description: "Le contenu a été régénéré avec succès.",
          variant: "success",
        });
        
        setRegeneratingId(null);
      }, 1500);
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/content/${contentId}/regenerate/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone: aiTone, language: aiLanguage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Échec de la régénération");
      }

      toast({
        title: "Contenu régénéré",
        description: `Le contenu ${data.content.variant} a été régénéré.`,
        variant: "success",
      });

      await fetchData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de la régénération",
        variant: "error",
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  const handlePublishNow = async (publicationId: string) => {
    if (!canAutoPublish) {
      toast({
        title: "Mise à niveau requise",
        description: "La publication auto nécessite un plan Pro.",
        variant: "warning",
      });
      return;
    }

    setPublishingId(publicationId);

    try {
      const response = await fetch(`/api/publications/${publicationId}/publish`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Échec de la publication");
      }

      toast({
        title: data.success ? "Publié !" : "Échec de la publication",
        description: data.message,
        variant: data.success ? "success" : "error",
      });

      await fetchData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de la publication",
        variant: "error",
      });
    } finally {
      setPublishingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background rounded-xl border border-border p-8 text-center shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground mt-4">Chargement du contenu social...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Contenu Social</h2>
          <p className="text-sm text-muted-foreground">Générez des posts et suivez vos publications.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="hidden md:flex"
            onClick={() => setShowConnectModal(true)}
          >
            <Link2 className="w-4 h-4 mr-2" />
            Connecter
          </Button>
          
          {canEdit && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating || isGeneratingAi}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Modèle
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => setShowAiModal(true)}
                disabled={isGenerating || isGeneratingAi}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border-none"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    IA Génération...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Générer avec l&apos;IA
                    {!canUseAi && <span className="ml-2 text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-medium">Pro</span>}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* AI Generation Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Génération de Contenu IA
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAiModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <p className="text-sm text-muted-foreground">
                Générez du contenu social engageant grâce à l&apos;IA. Choisissez le ton et la langue.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ton</label>
                  <Select value={aiTone} onValueChange={(val) => setAiTone(val as AiTone)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un ton" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Par défaut - Équilibré & Pro</SelectItem>
                      <SelectItem value="friendly">Amical - Chaleureux & Conversationnel</SelectItem>
                      <SelectItem value="formal">Formel - Sérieux & Business</SelectItem>
                      <SelectItem value="punchy">Percutant - Audacieux & Accrocheur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Langue</label>
                  <Select value={aiLanguage} onValueChange={setAiLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">Anglais</SelectItem>
                      <SelectItem value="es">Espagnol</SelectItem>
                      <SelectItem value="de">Allemand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowAiModal(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleGenerateWithAi}
                  disabled={!canUseAi && !isDemo}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Générer
                </Button>
              </div>

              {!canUseAi && (
                <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  La génération IA nécessite un plan Pro
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Matrix */}
      {contents.length > 0 && channels.length > 0 && (
        <CampaignMatrix
          jobId={jobId}
          contents={contents}
          channels={channels}
          publications={publications}
          onPlanClick={(contentId, channelId) => setPlanningForMatrix({ contentId, channelId })}
          onPublicationClick={(pub) => setEditingPublication(pub)}
          onCopyLink={handleCopyApplyLink}
          canEdit={canEdit}
        />
      )}

      {/* Content list */}
      {contents.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/10">
          <CardContent className="p-12 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center shadow-inner">
              <Sparkles className="w-10 h-10 text-indigo-500" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-xl font-bold text-foreground">Générez votre pack social</h3>
              <p className="text-muted-foreground">
                Créez instantanément des posts optimisés pour TikTok, Instagram, LinkedIn et WhatsApp grâce à notre IA.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              {canEdit && (
                <Button 
                  onClick={() => setShowAiModal(true)} 
                  disabled={isGeneratingAi}
                  size="lg"
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200"
                >
                  <Wand2 className="w-5 h-5 mr-2" />
                  Générer avec l&apos;IA
                </Button>
              )}
              {canEdit && (
                <Button 
                  variant="outline"
                  onClick={handleGenerate} 
                  disabled={isGenerating}
                  size="lg"
                >
                  Utiliser un modèle
                </Button>
              )}
            </div>

            {channels.length === 0 && (
               <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3 text-left max-w-md">
                 <Link2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                 <div>
                   <h4 className="font-medium text-blue-900">Connectez vos réseaux</h4>
                   <p className="text-sm text-blue-700 mt-1">
                     Pour publier directement, n&apos;oubliez pas de <button onClick={() => setShowConnectModal(true)} className="underline font-semibold hover:text-blue-800">connecter vos comptes</button>.
                   </p>
                 </div>
               </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Variantes de contenu
            </h3>
            {contents.length > 0 && (
              <Badge variant="secondary" className="bg-secondary/50">
                {contents.length} variantes
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {contents.map((content) => {
              const config = VARIANT_CONFIG[content.variant];
              const statusConfig = STATUS_CONFIG[content.status];
              const isRegenerating = regeneratingId === content.id;

              return (
                <Card key={content.id} className={cn(
                  "transition-all hover:shadow-md border-muted/60",
                  content.status === "ARCHIVED" && "opacity-60 bg-muted/20"
                )}>
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${config.color} shadow-sm ring-1 ring-black/5`}>
                          {config.icon}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{config.label}</h4>
                          {content.title && <p className="text-sm text-muted-foreground">{content.title}</p>}
                        </div>
                      </div>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Body preview */}
                    <div className="bg-gradient-to-b from-secondary/30 to-secondary/10 rounded-xl p-4 mb-4 border border-border/50 min-h-[120px] relative group">
                      <div className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed line-clamp-6">
                        {content.body}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background/10 to-transparent pointer-events-none" />
                    </div>

                    {/* Hashtags */}
                    {content.suggestedHashtags && (
                      <div className="mb-4 px-4 py-2 bg-primary/5 rounded-lg border border-primary/10">
                        <p className="text-xs text-primary/70 mb-1 uppercase tracking-wider font-bold">Hashtags</p>
                        <p className="text-sm text-primary font-medium truncate">{content.suggestedHashtags}</p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
                      {content.generatedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(content.generatedAt).toLocaleDateString()}
                        </div>
                      )}
                      {content._count.publications > 0 && (
                        <div className="flex items-center gap-1 text-blue-600 font-medium">
                          <Share2 className="w-3 h-3" />
                          {content._count.publications} publication(s)
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingContent(content)}
                          className="h-8"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                          {canEdit ? "Modifier" : "Voir"}
                        </Button>
                        
                        {/* Regenerate Button */}
                        {canEdit && (canUseAi || isDemo) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateWithAi(content.id)}
                            disabled={isRegenerating}
                            className="h-8 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                            title="Régénérer avec l'IA"
                          >
                            {isRegenerating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(content)}
                          className="h-8"
                        >
                          {copiedId === content.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                              Copié
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 mr-1.5" />
                              Copier
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {canEdit && channels.length > 0 && content.status !== "ARCHIVED" && (
                        <Button
                          size="sm"
                          onClick={() => setPlanningContent(content)}
                          className="h-8 shadow-sm"
                        >
                          <Calendar className="w-3.5 h-3.5 mr-1.5" />
                          Planifier
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No channels warning - moved to bottom if content exists */}
      {contents.length > 0 && channels.length === 0 && canEdit && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Link2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Aucun canal connecté</h4>
            <p className="text-sm text-blue-700 mt-1">
              Pour publier directement depuis l&apos;application,{" "}
              <button onClick={() => setShowConnectModal(true)} className="underline hover:no-underline font-medium">
                connectez vos comptes sociaux
              </button>.
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      {editingContent && (
        <ContentEditModal
          content={editingContent}
          jobId={jobId}
          onClose={() => setEditingContent(null)}
          onSave={handleContentUpdate}
          isDemo={isDemo}
          canEdit={canEdit}
        />
      )}

      {planningContent && (
        <PlanPublicationModal
          content={planningContent}
          jobId={jobId}
          channels={channels}
          onClose={() => setPlanningContent(null)}
          onSave={fetchData}
          isDemo={isDemo}
        />
      )}

      {planningForMatrix && (
        <PlanPublicationModal
          content={null}
          contentId={planningForMatrix.contentId}
          channelId={planningForMatrix.channelId}
          jobId={jobId}
          channels={channels}
          onClose={() => setPlanningForMatrix(null)}
          onSave={fetchData}
          isDemo={isDemo}
        />
      )}

      {editingPublication && (
        <PublicationEditModal
          publication={editingPublication}
          jobId={jobId}
          onClose={() => setEditingPublication(null)}
          onSave={fetchData}
          isDemo={isDemo}
          canEdit={canEdit}
        />
      )}

      {showConnectModal && (
        <ConnectSocialModal
          onClose={() => setShowConnectModal(false)}
          isDemo={isDemo}
        />
      )}
    </div>
  );
}
