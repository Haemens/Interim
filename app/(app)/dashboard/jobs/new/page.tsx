"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface JobFormData {
  title: string;
  location: string;
  contractType: string;
  sector: string;
  salaryMin: string;
  salaryMax: string;
  description: string;
  status: "DRAFT" | "ACTIVE";
}

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    location: "",
    contractType: "CDI",
    sector: "",
    salaryMin: "",
    salaryMax: "",
    description: "",
    status: "DRAFT",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          location: formData.location || undefined,
          contractType: formData.contractType || undefined,
          sector: formData.sector || undefined,
          salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
          salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
          description: formData.description,
          status: formData.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Impossible de créer l'offre");
      }

      const data = await res.json();
      router.push(`/dashboard/jobs/${data.job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/jobs"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nouvelle Offre</h1>
          <p className="text-sm text-muted-foreground">Créez une nouvelle offre d&apos;emploi</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Section: Informations de base */}
        <div className="p-6 space-y-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">1</span>
            Informations de base
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Titre du poste <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary text-foreground placeholder:text-muted-foreground transition-colors"
              placeholder="ex: Opérateur Logistique, Chef d'Équipe..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Localisation
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary text-foreground placeholder:text-muted-foreground transition-colors"
                placeholder="ex: Paris, Lyon, Télétravail..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Type de contrat
              </label>
              <select
                name="contractType"
                value={formData.contractType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary text-foreground transition-colors"
              >
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="INTERIM">Intérim</option>
                <option value="FREELANCE">Freelance</option>
                <option value="STAGE">Stage</option>
                <option value="ALTERNANCE">Alternance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Secteur d&apos;activité
            </label>
            <input
              type="text"
              name="sector"
              value={formData.sector}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary text-foreground placeholder:text-muted-foreground transition-colors"
              placeholder="ex: Logistique, Industrie, BTP, Santé..."
            />
          </div>
        </div>

        {/* Section: Rémunération */}
        <div className="p-6 space-y-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">2</span>
            Rémunération
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Salaire minimum (€/mois)
              </label>
              <input
                type="number"
                name="salaryMin"
                value={formData.salaryMin}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary text-foreground placeholder:text-muted-foreground transition-colors"
                placeholder="ex: 1800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Salaire maximum (€/mois)
              </label>
              <input
                type="number"
                name="salaryMax"
                value={formData.salaryMax}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary text-foreground placeholder:text-muted-foreground transition-colors"
                placeholder="ex: 2500"
              />
            </div>
          </div>
        </div>

        {/* Section: Description */}
        <div className="p-6 space-y-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">3</span>
            Description du poste
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Description <span className="text-destructive">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={6}
              className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary resize-none text-foreground placeholder:text-muted-foreground transition-colors"
              placeholder="Décrivez les missions, responsabilités et avantages du poste..."
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Astuce : Soyez précis sur les missions et les avantages pour attirer les meilleurs candidats.
            </p>
          </div>
        </div>

        {/* Section: Publication */}
        <div className="p-6 space-y-5">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">4</span>
            Publication
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Statut de l&apos;offre
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary text-foreground transition-colors"
            >
              <option value="DRAFT">Brouillon (non visible)</option>
              <option value="ACTIVE">Active (visible par les candidats)</option>
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Vous pourrez modifier le statut à tout moment depuis la page de l&apos;offre.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-secondary/30 border-t border-border flex justify-end gap-3">
          <Link
            href="/dashboard/jobs"
            className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Création...
              </>
            ) : (
              "Créer l'offre"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
