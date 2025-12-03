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
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Play
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
  isSimulated?: boolean;
}

interface ConnectSocialModalProps {
  onClose: () => void;
  isDemo: boolean;
}

// =============================================================================
// SOCIAL ICONS (SVG)
// =============================================================================

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
  </svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// =============================================================================
// PROVIDER CONFIG
// =============================================================================

const PROVIDER_CONFIG: Record<SocialProvider, {
  name: string;
  Icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  iconColor: string;
  description: string;
  available: boolean;
}> = {
  LINKEDIN: {
    name: "LinkedIn",
    Icon: LinkedInIcon,
    bgColor: "bg-[#0A66C2]",
    iconColor: "text-white",
    description: "Publiez vos offres sur votre profil ou page entreprise",
    available: true,
  },
  INSTAGRAM: {
    name: "Instagram",
    Icon: InstagramIcon,
    bgColor: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
    iconColor: "text-white",
    description: "Partagez des visuels attractifs pour vos offres",
    available: true,
  },
  TIKTOK: {
    name: "TikTok",
    Icon: TikTokIcon,
    bgColor: "bg-black",
    iconColor: "text-white",
    description: "Créez des vidéos engageantes pour recruter",
    available: true,
  },
  FACEBOOK: {
    name: "Facebook",
    Icon: FacebookIcon,
    bgColor: "bg-[#1877F2]",
    iconColor: "text-white",
    description: "Diffusez vos offres sur votre page Facebook",
    available: true,
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
  const [connectingProvider, setConnectingProvider] = useState<SocialProvider | null>(null);

  // Fetch connected accounts (or use simulated ones in demo)
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        // En mode démo, on charge les comptes simulés du localStorage
        if (isDemo) {
          const stored = localStorage.getItem("demo_social_accounts");
          if (stored) {
            setAccounts(JSON.parse(stored));
          }
          setIsLoading(false);
          return;
        }

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
  }, [isDemo]);

  // Simulate connection in demo mode
  const handleDemoConnect = (provider: SocialProvider) => {
    setConnectingProvider(provider);
    
    // Simulate OAuth delay
    setTimeout(() => {
      const config = PROVIDER_CONFIG[provider];
      const newAccount: SocialAccount = {
        id: `demo-${provider.toLowerCase()}-${Date.now()}`,
        provider,
        accountName: `Demo ${config.name} Account`,
        accountHandle: `@demo_${config.name.toLowerCase()}`,
        accountType: "demo",
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsedAt: null,
        lastError: null,
        createdAt: new Date().toISOString(),
        isExpired: false,
        channelCount: 0,
        isSimulated: true,
      };

      const updatedAccounts = [...accounts, newAccount];
      setAccounts(updatedAccounts);
      
      // Persist in localStorage for demo
      localStorage.setItem("demo_social_accounts", JSON.stringify(updatedAccounts));
      
      setConnectingProvider(null);
      
      toast({
        title: "Compte connecté (Simulation)",
        description: `${config.name} a été connecté en mode démo. Vous pouvez maintenant simuler des publications.`,
        variant: "success",
      });
    }, 1500);
  };

  // Handle connect
  const handleConnect = (provider: SocialProvider) => {
    if (isDemo) {
      handleDemoConnect(provider);
      return;
    }

    // Redirect to OAuth flow
    window.location.href = `/api/auth/social/${provider.toLowerCase()}`;
  };

  // Handle disconnect
  const handleDisconnect = async (accountId: string, isSimulated?: boolean) => {
    if (isDemo || isSimulated) {
      // Remove from local state and localStorage
      const updatedAccounts = accounts.filter((a) => a.id !== accountId);
      setAccounts(updatedAccounts);
      localStorage.setItem("demo_social_accounts", JSON.stringify(updatedAccounts));
      
      toast({
        title: "Compte déconnecté",
        description: "Le compte a été déconnecté.",
        variant: "success",
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
              {isDemo 
                ? "Simulez la connexion de vos réseaux sociaux" 
                : "Connectez vos réseaux sociaux pour publier automatiquement"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-6 space-y-3 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Demo mode banner */}
              {isDemo && (
                <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-800">
                      Mode Démo - Simulation activée
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600 mt-1">
                    Connectez des comptes fictifs pour tester le flux de publication
                  </p>
                </div>
              )}

              {/* Provider list */}
              {(Object.keys(PROVIDER_CONFIG) as SocialProvider[]).map((provider) => {
                const config = PROVIDER_CONFIG[provider];
                const { Icon } = config;
                const connectedAccount = getConnectedAccount(provider);
                const isConnecting = connectingProvider === provider;

                return (
                  <div
                    key={provider}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${config.bgColor} shadow-md`}>
                        <Icon className={`w-5 h-5 ${config.iconColor}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{config.name}</h3>
                          {connectedAccount?.isSimulated && (
                            <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-600">
                              Simulé
                            </Badge>
                          )}
                        </div>
                        {connectedAccount ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-sm text-green-700 dark:text-green-500 font-medium">
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
                          onClick={() => handleDisconnect(connectedAccount.id, connectedAccount.isSimulated)}
                          disabled={disconnectingId === connectedAccount.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {disconnectingId === connectedAccount.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Unlink className="w-4 h-4 mr-1" />
                              Retirer
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnect(provider)}
                          disabled={isConnecting}
                          className="shadow-sm"
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Connexion...
                            </>
                          ) : (
                            <>
                              <Link2 className="w-4 h-4 mr-1" />
                              Connecter
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Info banner */}
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Play className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Comment ça marche ?</h4>
                    <ol className="text-sm text-blue-700 dark:text-blue-400 mt-1 space-y-1 list-decimal list-inside">
                      <li>Connectez vos comptes sociaux ci-dessus</li>
                      <li>Générez du contenu pour vos offres d&apos;emploi</li>
                      <li>Planifiez ou publiez directement sur vos réseaux</li>
                    </ol>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex justify-between items-center flex-shrink-0 bg-secondary/20">
          <div className="text-xs text-muted-foreground">
            {accounts.length > 0 && (
              <span>{accounts.length} compte{accounts.length > 1 ? "s" : ""} connecté{accounts.length > 1 ? "s" : ""}</span>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </Card>
    </div>
  );
}
