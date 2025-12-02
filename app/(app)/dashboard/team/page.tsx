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
      return "bg-purple-100 text-purple-700";
    case "ADMIN":
      return "bg-blue-100 text-blue-700";
    case "RECRUITER":
      return "bg-green-100 text-green-700";
    case "VIEWER":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
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
        throw new Error(data.error || "Failed to fetch team");
      }
      const data = await res.json();
      setTeam(data.team);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch team");
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
        throw new Error(data.error || "Failed to invite member");
      }

      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      fetchTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
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
        throw new Error(data.error || "Failed to update role");
      }

      fetchTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemove(membershipId: string, email: string) {
    if (!confirm(`Remove ${email} from the team?`)) return;

    try {
      setError(null);
      const res = await fetch(`/api/team/${membershipId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      fetchTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading team...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
        <p className="text-slate-600 mt-1">
          Manage your team members and their roles.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {inviteSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {inviteSuccess}
        </div>
      )}

      {/* Invite Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Invite Team Member
        </h2>
        <form onSubmit={handleInvite} className="flex flex-wrap gap-4">
          <input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "RECRUITER" | "VIEWER")}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ADMIN">Admin</option>
            <option value="RECRUITER">Recruiter</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </form>
      </div>

      {/* Team List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Team Members ({team.length})
          </h2>
        </div>

        {team.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            No team members yet. Invite someone to get started!
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {team.map((member) => (
              <li key={member.membershipId} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-medium">
                        {(member.name || member.email)[0].toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div>
                      <p className="font-medium text-slate-900">
                        {member.name || "Pending invitation"}
                      </p>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Role Badge/Select */}
                    {member.role === "OWNER" ? (
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${getRoleColor(member.role)}`}
                      >
                        {member.role}
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.membershipId, e.target.value)
                        }
                        className="text-sm px-3 py-1 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {ROLES.filter((r) => r !== "OWNER").map((role) => (
                          <option key={role} value={role}>
                            {role}
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
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Meta info */}
                <div className="mt-2 ml-14 text-xs text-slate-400">
                  Joined{" "}
                  {new Date(member.joinedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {member.lastLoginAt && (
                    <>
                      {" "}
                      · Last login{" "}
                      {new Date(member.lastLoginAt).toLocaleDateString("en-US", {
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
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className={`inline-block px-2 py-0.5 rounded ${getRoleColor("OWNER")}`}>
              OWNER
            </span>
            <p className="text-slate-600 mt-1">
              Full access. Can manage billing, delete agency, and manage all team members.
            </p>
          </div>
          <div>
            <span className={`inline-block px-2 py-0.5 rounded ${getRoleColor("ADMIN")}`}>
              ADMIN
            </span>
            <p className="text-slate-600 mt-1">
              Can create/edit jobs, manage applications, and invite team members.
            </p>
          </div>
          <div>
            <span className={`inline-block px-2 py-0.5 rounded ${getRoleColor("RECRUITER")}`}>
              RECRUITER
            </span>
            <p className="text-slate-600 mt-1">
              Can view/edit jobs and applications, create shortlists.
            </p>
          </div>
          <div>
            <span className={`inline-block px-2 py-0.5 rounded ${getRoleColor("VIEWER")}`}>
              VIEWER
            </span>
            <p className="text-slate-600 mt-1">
              Read-only access to jobs and applications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
