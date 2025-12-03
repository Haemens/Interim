"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Download } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "branding" | "notifications" | "import">("general");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoClick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Veuillez sélectionner une image (PNG, JPG, etc.)");
        return;
      }
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        alert("Le fichier est trop volumineux. Maximum 2MB.");
        return;
      }
      setLogoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  const tabs = [
    { key: "general", label: "Général" },
    { key: "branding", label: "Marque" },
    { key: "notifications", label: "Notifications" },
    { key: "import", label: "Import CSV" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">
          Gérez les paramètres et préférences de votre agence.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-card rounded-xl border border-border p-6">
        {activeTab === "general" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">
                Informations de l&apos;agence
              </h3>
              <div className="grid gap-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Nom de l&apos;agence
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                    placeholder="Votre agence"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Contactez le support pour modifier le nom de votre agence.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Identifiant (Slug)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-muted-foreground"
                    disabled
                    placeholder="votre-agence"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Utilisé dans l&apos;URL de votre agence.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Zone de danger
              </h3>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h4 className="font-medium text-destructive">Supprimer l&apos;agence</h4>
                <p className="text-sm text-destructive/90 mt-1">
                  La suppression est irréversible. Veuillez être certain de votre choix.
                </p>
                <button
                  className="mt-3 px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-lg hover:bg-destructive/90 transition-colors opacity-50 cursor-not-allowed"
                  disabled
                >
                  Supprimer l&apos;agence
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "branding" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">
                Couleurs de la marque
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ces couleurs seront utilisées sur votre page publique, vos offres d&apos;emploi et dans les emails envoyés aux candidats.
                Choisissez une couleur principale qui correspond à votre identité visuelle.
              </p>
              <div className="grid gap-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Couleur principale
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="w-10 h-10 rounded border border-input cursor-pointer bg-transparent"
                      defaultValue="#4F46E5"
                    />
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-foreground"
                      placeholder="#4F46E5"
                      defaultValue="#4F46E5"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Logo</h3>
              
              {/* Hidden file input */}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              
              {logoPreview ? (
                /* Logo preview */
                <div className="relative inline-block">
                  <div className="border-2 border-border rounded-lg p-4 bg-muted/30">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="max-h-32 max-w-xs object-contain"
                    />
                  </div>
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                    title="Supprimer le logo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-muted-foreground mt-2">
                    {logoFile?.name}
                  </p>
                </div>
              ) : (
                /* Upload zone */
                <div 
                  onClick={handleLogoClick}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="text-muted-foreground mb-2">
                    <Upload className="w-10 h-10 mx-auto" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Glissez-déposez votre logo ici, ou <span className="text-primary font-medium">cliquez pour parcourir</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG jusqu&apos;à 2MB
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                Enregistrer
              </button>
            </div>
          </div>
        )}

        {activeTab === "import" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">
                Importer un vivier client
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Vous pouvez importer vos clients existants depuis un fichier CSV. 
                Téléchargez le modèle pour voir le format attendu.
              </p>
              
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="text-muted-foreground mb-2">
                  <Upload className="w-10 h-10 mx-auto" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Glissez-déposez votre fichier CSV ici, ou <span className="text-primary font-medium">cliquez pour parcourir</span>
                </p>
                <input type="file" accept=".csv" className="hidden" />
              </div>

              <div className="mt-4 flex justify-between items-center">
                <button className="text-sm text-primary hover:underline flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Télécharger le modèle CSV
                </button>
                <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                  Lancer l&apos;import
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">
                Notifications Email
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary border-input rounded focus:ring-primary bg-background"
                    defaultChecked
                  />
                  <span className="text-sm text-foreground">
                    Nouvelle candidature reçue
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary border-input rounded focus:ring-primary bg-background"
                    defaultChecked
                  />
                  <span className="text-sm text-foreground">
                    Feedback client reçu
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary border-input rounded focus:ring-primary bg-background"
                  />
                  <span className="text-sm text-foreground">
                    Rapport hebdomadaire
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                Enregistrer les préférences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
