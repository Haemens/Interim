"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Loader2, 
  Link2, 
  Unlink, 
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

type SocialProvider = "LINKEDIN" | "INSTAGRAM" | "TIKTOK" | "FACEBOOK";

interface SocialAccount {
  id: string;
  provider: SocialProvider;
  accountName: string | null;
  accountHandle: string | null;
  accountType: string | null;
  tokenExpiresAt: string | null;
  lastUsedAt: string | null;
  lastError: string | null;
  createdAt: string;
  isExpired: boolean;
  channelCount: number;
}

interface ConnectSocialModalProps {
  onClose: () => void;
  isDemo: boolean;
}

// =============================================================================
// PROVIDER CONFIG
// =============================================================================

const PROVIDER_CONFIG: Record<SocialProvider, {
  name: string;
  icon: string;
  color: string;
  description: string;
  available: boolean;
}> = {
  LINKEDIN: {
    name: "LinkedIn",
    icon: "💼",
    color: "bg-blue-700 text-white",
    description: "Post job updates to your LinkedIn profile or company page",
    available: true,
  },
  INSTAGRAM: {
    name: "Instagram",
    icon: "📸",
    color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    description: "Share visual job posts to Instagram",
    available: false, // Coming soon
  },
  TIKTOK: {
    name: "TikTok",
    icon: "🎵",
    color: "bg-black text-white",
    description: "Create engaging video job posts for TikTok",
    available: false, // Coming soon
  },
  FACEBOOK: {
    name: "Facebook",
    icon: "👥",
    color: "bg-blue-600 text-white",
    description: "Share job posts to your Facebook page",
    available: false, // Coming soon
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ConnectSocialModal({ onClose, isDemo }: ConnectSocialModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  // Fetch connected accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch("/api/social-accounts", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          setAccounts(data.accounts || []);
        }
      } catch (error) {
        console.error("Failed to fetch social accounts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  // Handle connect
  const handleConnect = (provider: SocialProvider) => {
    if (isDemo) {
      toast({
        title: "Mode Démo",
        description: "Créez votre agence pour connecter des comptes sociaux.",
        variant: "warning",
      });
      return;
    }

    // Redirect to OAuth flow
    window.location.href = `/api/auth/social/${provider.toLowerCase()}`;
  };

  // Handle disconnect
  const handleDisconnect = async (accountId: string) => {
    if (isDemo) {
      toast({
        title: "Mode Démo",
        description: "Créez votre agence pour gérer les comptes sociaux.",
        variant: "warning",
      });
      return;
    }

    setDisconnectingId(accountId);

    try {
      const response = await fetch("/api/social-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect");
      }

      // Remove from local state
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));

      toast({
        title: "Compte déconnecté",
        description: "Le compte a été déconnecté avec succès.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Échec de la déconnexion",
        variant: "error",
      });
    } finally {
      setDisconnectingId(null);
    }
  };

  // Get connected account for a provider
  const getConnectedAccount = (provider: SocialProvider) => {
    return accounts.find((a) => a.provider === provider);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4 flex-shrink-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Connecter vos comptes
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Connectez vos réseaux sociaux pour publier automatiquement
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-6 space-y-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Provider list */}
              {(Object.keys(PROVIDER_CONFIG) as SocialProvider[]).map((provider) => {
                const config = PROVIDER_CONFIG[provider];
                const connectedAccount = getConnectedAccount(provider);

                return (
                  <div
                    key={provider}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${config.color} shadow-sm`}>
                        {config.icon}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{config.name}</h3>
                          {!config.available && (
                            <Badge variant="secondary" className="text-[10px]">
                              Bientôt
                            </Badge>
                          )}
                        </div>
                        {connectedAccount ? (
                          <div className="flex items-center gap-2 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-sm text-green-700 font-medium">
                              {connectedAccount.accountName || "Connecté"}
                            </span>
                            {connectedAccount.isExpired && (
                              <Badge variant="destructive" className="text-[10px]">
                                Expiré
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {config.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      {connectedAccount ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(connectedAccount.id)}
                          disabled={disconnectingId === connectedAccount.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {disconnectingId === connectedAccount.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Unlink className="w-4 h-4 mr-1" />
                              Déconnecter
                            </>
                          )}
                        </Button>
                      ) : config.available ? (
                        <Button
                          size="sm"
                          onClick={() => handleConnect(provider)}
                          disabled={isDemo}
                        >
                          <Link2 className="w-4 h-4 mr-1" />
                          Connecter
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          <Clock className="w-4 h-4 mr-1" />
                          Bientôt
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Info banner */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Comment ça marche ?</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Une fois connecté, vous pourrez publier automatiquement vos offres d&apos;emploi 
                      sur vos réseaux sociaux depuis la page de contenu social.
                    </p>
                  </div>
                </div>
              </div>

              {/* Demo warning */}
              {isDemo && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Mode Démo</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        La connexion de comptes sociaux n&apos;est pas disponible en mode démo. 
                        Créez votre propre agence pour utiliser cette fonctionnalité.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex justify-end flex-shrink-0 bg-secondary/20">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </Card>
    </div>
  );
}
