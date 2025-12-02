"use client";

import { useState, useEffect } from "react";

interface TeamMember {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "OWNER" | "ADMIN" | "RECRUITER" | "VIEWER";
  invitedAt: string | null;
  lastLoginAt: string | null;
  joinedAt: string;
}

const ROLES = ["OWNER", "ADMIN", "RECRUITER", "VIEWER"] as const;

function getRoleColor(role: string): string {
  switch (role) {
    case "OWNER":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "ADMIN":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "RECRUITER":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "VIEWER":
      return "bg-secondary text-muted-foreground";
    default:
      return "bg-secondary text-muted-foreground";
  }
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "RECRUITER" | "VIEWER">("RECRUITER");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Fetch team members
  useEffect(() => {
    fetchTeam();
  }, []);

  async function fetchTeam() {
    try {
      setLoading(true);
      const res = await fetch("/api/team");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Impossible de récupérer l'équipe");
      }
      const data = await res.json();
      setTeam(data.team);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de récupérer l'équipe");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInviting(true);
      setError(null);
      setInviteSuccess(null);

      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Impossible d'inviter le membre");
      }

      setInviteSuccess(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail("");
      fetchTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'inviter le membre");
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(membershipId: string, newRole: string) {
    try {
      setError(null);
      const res = await fetch(`/api/team/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Impossible de mettre à jour le rôle");
      }

      fetchTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour le rôle");
    }
  }

  async function handleRemove(membershipId: string, email: string) {
    if (!confirm(`Retirer ${email} de l'équipe ?`)) return;

    try {
      setError(null);
      const res = await fetch(`/api/team/${membershipId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Impossible de retirer le membre");
      }

      fetchTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de retirer le membre");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement de l'équipe...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestion de l&apos;équipe</h1>
        <p className="text-muted-foreground mt-1">
          Gérez les membres de votre équipe et leurs rôles.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {inviteSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 px-4 py-3 rounded-lg">
          {inviteSuccess}
        </div>
      )}

      {/* Invite Form */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Inviter un membre
        </h2>
        <form onSubmit={handleInvite} className="flex flex-wrap gap-4">
          <input
            type="email"
            placeholder="Adresse email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            required
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "RECRUITER" | "VIEWER")}
            className="px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          >
            <option value="ADMIN">Admin</option>
            <option value="RECRUITER">Recruteur</option>
            <option value="VIEWER">Observateur</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {inviting ? "Envoi..." : "Envoyer l'invitation"}
          </button>
        </form>
      </div>

      {/* Team List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Membres de l&apos;équipe ({team.length})
          </h2>
        </div>

        {team.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Aucun membre. Invitez quelqu'un pour commencer !
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {team.map((member) => (
              <li key={member.membershipId} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {(member.name || member.email)[0].toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div>
                      <p className="font-medium text-foreground">
                        {member.name || "Invitation en attente"}
                      </p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Role Badge/Select */}
                    {member.role === "OWNER" ? (
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${getRoleColor(member.role)}`}
                      >
                        PROPRIÉTAIRE
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.membershipId, e.target.value)
                        }
                        className="text-sm px-3 py-1 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                      >
                        {ROLES.filter((r) => r !== "OWNER").map((role) => (
                          <option key={role} value={role}>
                            {role === "ADMIN" ? "ADMIN" : role === "RECRUITER" ? "RECRUTEUR" : "OBSERVATEUR"}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Remove Button */}
                    {member.role !== "OWNER" && (
                      <button
                        onClick={() =>
                          handleRemove(member.membershipId, member.email)
                        }
                        className="text-sm text-red-600 hover:text-red-700 font-medium dark:text-red-400 dark:hover:text-red-300"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>

                {/* Meta info */}
                <div className="mt-2 ml-14 text-xs text-muted-foreground">
                  Rejoint le{" "}
                  {new Date(member.joinedAt).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {member.lastLoginAt && (
                    <>
                      {" "}
                      · Dernière connexion{" "}
                      {new Date(member.lastLoginAt).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Role Descriptions */}
      <div className="bg-secondary/30 rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Permissions des rôles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className={`inline-block px-2 py-0.5 rounded ${getRoleColor("OWNER")}`}>
              PROPRIÉTAIRE
            </span>
            <p className="text-muted-foreground mt-1">
              Accès complet. Peut gérer la facturation, supprimer l&apos;agence et gérer tous les membres.
            </p>
          </div>
          <div>
            <span className={`inline-block px-2 py-0.5 rounded ${getRoleColor("ADMIN")}`}>
              ADMIN
            </span>
            <p className="text-muted-foreground mt-1">
              Peut créer/modifier des offres, gérer les candidatures et inviter des membres.
            </p>
          </div>
          <div>
            <span className={`inline-block px-2 py-0.5 rounded ${getRoleColor("RECRUITER")}`}>
              RECRUTEUR
            </span>
            <p className="text-muted-foreground mt-1">
              Peut voir/modifier les offres et candidatures, créer des shortlists.
            </p>
          </div>
          <div>
            <span className={`inline-block px-2 py-0.5 rounded ${getRoleColor("VIEWER")}`}>
              OBSERVATEUR
            </span>
            <p className="text-muted-foreground mt-1">
              Accès en lecture seule aux offres et candidatures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
