"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ContactWarning } from "@/components/activity/contact-warning";
import { ActivityTimeline } from "@/components/activity/activity-timeline";

interface Application {
  id: string;
  status: string;
  createdAt: string;
  job: {
    id: string;
    title: string;
    status: string;
  };
}

interface CandidateProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  cvUrl?: string;
  skills: string[];
  sectors: string[];
  lastJobTitle?: string;
  location?: string;
  notes?: string;
  socialSecurityNumber?: string;
  iban?: string;
  bic?: string;
  hourlyRate?: string;
  status: "ACTIVE" | "DO_NOT_CONTACT" | "BLACKLISTED";
  consentToContact: boolean;
  firstAppliedAt: string;
  lastAppliedAt: string;
  lastContactedAt?: string;
  lastContactedBy?: {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
  };
  applications: Application[];
  missions: {
    id: string;
    status: string;
    startDate: string;
    endDatePlanned: string;
    job: { id: string; title: string };
    client: { id: string; name: string };
  }[];
  _count: {
    applications: number;
    missions: number;
  };
  documents?: { id: string; name: string; url: string }[];
  availabilityDate?: string;
  experienceYears?: number;
  mobilityRadius?: number;
}

function getStatusBadge(status: CandidateProfile["status"]) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium";
    case "DO_NOT_CONTACT":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-medium";
    case "BLACKLISTED":
      return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 font-medium";
    default:
      return "bg-secondary text-secondary-foreground font-medium";
  }
}

function translateStatus(status: CandidateProfile["status"]) {
  switch (status) {
    case "ACTIVE":
      return "Actif";
    case "DO_NOT_CONTACT":
      return "Ne pas contacter";
    case "BLACKLISTED":
      return "Liste noire";
    default:
      return status;
  }
}

function getAppStatusBadge(status: string) {
  switch (status) {
    case "NEW":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-medium";
    case "CONTACTED":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-medium";
    case "QUALIFIED":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 font-medium";
    case "PLACED":
      return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 font-medium";
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 font-medium";
    default:
      return "bg-secondary text-secondary-foreground font-medium";
  }
}

function translateAppStatus(status: string) {
  const map: Record<string, string> = {
    NEW: "Nouveau",
    CONTACTED: "Contacté",
    QUALIFIED: "Qualifié",
    PLACED: "Recruté",
    REJECTED: "Refusé",
  };
  return map[status] || status;
}

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable fields
  const [status, setStatus] = useState<CandidateProfile["status"]>("ACTIVE");
  const [notes, setNotes] = useState("");
  const [skills, setSkills] = useState("");
  const [sectors, setSectors] = useState("");
  const [location, setLocation] = useState("");
  const [ssn, setSsn] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [mobilityRadius, setMobilityRadius] = useState("");

  useEffect(() => {
    async function fetchCandidate() {
      try {
        const res = await fetch(`/api/candidates/${id}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Impossible de charger le candidat");
        }

        const data = await res.json();
        setCandidate(data.candidate);
        setStatus(data.candidate.status);
        setNotes(data.candidate.notes || "");
        setSkills(data.candidate.skills.join(", "));
        setSectors(data.candidate.sectors.join(", "));
        setLocation(data.candidate.location || "");
        setSsn(data.candidate.socialSecurityNumber || "");
        setIban(data.candidate.iban || "");
        setBic(data.candidate.bic || "");
        setHourlyRate(data.candidate.hourlyRate || "");
        setAvailabilityDate(data.candidate.availabilityDate ? new Date(data.candidate.availabilityDate).toISOString().split('T')[0] : "");
        setExperienceYears(data.candidate.experienceYears?.toString() || "");
        setMobilityRadius(data.candidate.mobilityRadius?.toString() || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger le candidat");
      } finally {
        setLoading(false);
      }
    }

    fetchCandidate();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          sectors: sectors.split(",").map((s) => s.trim()).filter(Boolean),
          location: location || undefined,
          socialSecurityNumber: ssn || undefined,
          iban: iban || undefined,
          bic: bic || undefined,
          hourlyRate: hourlyRate || undefined,
          availabilityDate: availabilityDate || undefined,
          experienceYears: experienceYears ? parseInt(experienceYears) : undefined,
          mobilityRadius: mobilityRadius ? parseInt(mobilityRadius) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Impossible de sauvegarder");
      }

      const data = await res.json();
      setCandidate(data.candidate);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement ce candidat ? Cette action est irréversible et anonymisera les données associées.")) return;
    
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Suppression échouée");
      }
      router.push("/dashboard/candidates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer le candidat.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Chargement du profil...
        </div>
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </div>
    );
  }

  if (!candidate) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/candidates"
            className="text-sm text-muted-foreground hover:text-primary mb-2 inline-flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour au vivier
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{candidate.fullName}</h1>
          <p className="text-muted-foreground">{candidate.email}</p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${getStatusBadge(candidate.status)}`}>
          {translateStatus(candidate.status)}
        </span>
      </div>

      <ContactWarning 
        lastContactedAt={candidate.lastContactedAt}
        lastContactedByName={candidate.lastContactedBy ? (candidate.lastContactedBy.firstName || candidate.lastContactedBy.name) : undefined}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Modifications enregistrées !
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informations de contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                <p className="font-medium text-foreground">{candidate.email}</p>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Téléphone</p>
                <p className="font-medium text-foreground">{candidate.phone || "—"}</p>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Localisation</p>
                <p className="font-medium text-foreground">{candidate.location || "—"}</p>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dernier poste</p>
                <p className="font-medium text-foreground">{candidate.lastJobTitle || "—"}</p>
              </div>
              <div className="md:col-span-2 p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">CV / Document</p>
                {candidate.cvUrl ? (
                  <div className="flex items-center gap-3">
                    <a
                      href={candidate.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Télécharger le CV
                    </a>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-sm">Aucun CV disponible</p>
                )}
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Consentement</p>
                <p className="font-medium text-foreground">{candidate.consentToContact ? "Oui" : "Non"}</p>
              </div>
            </div>
          </div>

          {/* Applications */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Candidatures ({candidate._count.applications})
            </h2>
            {candidate.applications.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Aucune candidature pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {candidate.applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">{app.job.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(app.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${getAppStatusBadge(app.status)}`}
                    >
                      {translateAppStatus(app.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Missions */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Missions ({candidate._count.missions})
            </h2>
            {candidate.missions.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Aucune mission.</p>
            ) : (
              <div className="space-y-3">
                {candidate.missions.map((mission) => (
                  <Link
                    href={`/dashboard/missions/${mission.id}`}
                    key={mission.id}
                    className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">{mission.job.title}</p>
                      <p className="text-sm text-muted-foreground">{mission.client.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Du {new Date(mission.startDate).toLocaleDateString()} au {new Date(mission.endDatePlanned).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-background border border-border">
                      {mission.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Activity Section */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
               <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               Activité & Historique
            </h2>
            <ActivityTimeline targetType="CANDIDATE" targetId={candidate.id} />
          </div>
        </div>

        {/* Edit Panel */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifier le profil
            </h2>
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Statut
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CandidateProfile["status"])}
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background text-foreground transition-colors"
                >
                  <option value="ACTIVE">Actif</option>
                  <option value="DO_NOT_CONTACT">Ne pas contacter</option>
                  <option value="BLACKLISTED">Liste noire</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Localisation
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ville, Région"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background text-foreground placeholder:text-muted-foreground transition-colors"
                />
              </div>

              {/* Sectors */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Secteurs <span className="text-muted-foreground font-normal">(séparés par virgule)</span>
                </label>
                <input
                  type="text"
                  value={sectors}
                  onChange={(e) => setSectors(e.target.value)}
                  placeholder="Logistique, Industrie, BTP..."
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background text-foreground placeholder:text-muted-foreground transition-colors"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Compétences <span className="text-muted-foreground font-normal">(séparées par virgule)</span>
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="CACES, nuit, cariste..."
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background text-foreground placeholder:text-muted-foreground transition-colors"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Notes internes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Ajoutez des notes sur ce candidat..."
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background text-foreground placeholder:text-muted-foreground resize-none transition-colors"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </button>
            </div>
          </div>

          {/* Payroll Info */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Disponibilité & Préférences
            </h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Disponibilité</label>
                    <input 
                        type="date" 
                        value={availabilityDate} 
                        onChange={e => setAvailabilityDate(e.target.value)} 
                        className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background text-foreground transition-colors"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Expérience (ans)</label>
                        <input 
                            type="number" 
                            value={experienceYears} 
                            onChange={e => setExperienceYears(e.target.value)} 
                            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background text-foreground transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Mobilité (km)</label>
                        <input 
                            type="number" 
                            value={mobilityRadius} 
                            onChange={e => setMobilityRadius(e.target.value)} 
                            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background text-foreground transition-colors"
                        />
                    </div>
                </div>
            </div>
            
            <h2 className="text-lg font-semibold text-foreground mt-8 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Documents
            </h2>
            {candidate.documents && candidate.documents.length > 0 ? (
                <ul className="space-y-2">
                    {candidate.documents.map(doc => (
                        <li key={doc.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg text-sm">
                            <span className="font-medium">{doc.name}</span>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Voir</a>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground italic">Aucun document.</p>
            )}
          </div>

          {/* Payroll Info */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Informations de Paie
            </h2>
            <div className="space-y-4">
              {/* Hourly Rate */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Taux Horaire (€)
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background text-foreground placeholder:text-muted-foreground transition-colors"
                />
              </div>

              {/* SSN */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Numéro Sécurité Sociale
                </label>
                <input
                  type="text"
                  value={ssn}
                  onChange={(e) => setSsn(e.target.value)}
                  placeholder="1 23 45 67..."
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background text-foreground placeholder:text-muted-foreground transition-colors"
                />
              </div>

              {/* IBAN */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  IBAN
                </label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="FR76..."
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background text-foreground placeholder:text-muted-foreground transition-colors"
                />
              </div>

              {/* BIC */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  BIC
                </label>
                <input
                  type="text"
                  value={bic}
                  onChange={(e) => setBic(e.target.value)}
                  placeholder="ABCD..."
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background text-foreground placeholder:text-muted-foreground transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-3">Historique</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Première candidature</span>
                <span className="text-foreground font-medium">
                  {new Date(candidate.firstAppliedAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Dernière candidature</span>
                <span className="text-foreground font-medium">
                  {new Date(candidate.lastAppliedAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          </div>
          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900 p-6 shadow-sm mt-6">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Zone de Danger (GDPR)
            </h2>
            <div className="flex items-center justify-between flex-wrap gap-4">
                <p className="text-sm text-red-700 dark:text-red-300">
                    Supprimer définitivement ce candidat.
                    <br/>Cette action est irréversible.
                </p>
                <button 
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                    Supprimer le candidat
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
