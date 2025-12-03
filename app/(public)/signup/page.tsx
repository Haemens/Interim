"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

interface FormData {
  agencyName: string;
  agencySlug: string;
  agencyEmail: string;
  userName: string;
  userEmail: string;
  password: string;
  confirmPassword: string;
}

type FormState = "idle" | "submitting" | "success" | "error";

export default function SignupPage() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    agencyName: "",
    agencySlug: "",
    agencyEmail: "",
    userName: "",
    userEmail: "",
    password: "",
    confirmPassword: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Auto-generate slug from agency name
    if (name === "agencyName" && !formData.agencySlug) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 63);
      setFormData((prev) => ({ ...prev, agencySlug: slug }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState("submitting");
    setError(null);

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      setFormState("error");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setFormState("error");
      return;
    }

    try {
      // Create account
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      setFormState("success");

      // Sign in the user
      const signInResult = await signIn("credentials", {
        email: formData.userEmail,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Account created but sign-in failed, redirect to login
        window.location.href = `/login?registered=true&email=${encodeURIComponent(formData.userEmail)}`;
        return;
      }

      // Redirect to the new agency's dashboard
      const baseUrl = window.location.origin;
      const protocol = baseUrl.includes("localhost") ? "http" : "https";
      const host = window.location.host;
      
      // Build subdomain URL
      let dashboardUrl: string;
      if (host.includes("localhost")) {
        dashboardUrl = `${protocol}://${data.agency.slug}.localhost:3000/dashboard`;
      } else {
        const parts = host.split(".");
        const domain = parts.slice(-2).join(".");
        dashboardUrl = `${protocol}://${data.agency.slug}.${domain}/dashboard`;
      }

      window.location.href = dashboardUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setFormState("error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-slate-900">
          Créez votre agence
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
            Se connecter
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error === "Passwords don't match" ? "Les mots de passe ne correspondent pas" :
               error === "Password must be at least 8 characters" ? "Le mot de passe doit faire au moins 8 caractères" :
               error === "Failed to create account" ? "Échec de la création du compte" :
               "Une erreur est survenue"}
            </div>
          )}

          {formState === "success" ? (
            <div className="text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Compte créé !
              </h2>
              <p className="text-slate-600">
                Redirection vers votre tableau de bord...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Agency Section */}
              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-sm font-medium text-slate-700 mb-4">
                  Détails de l'agence
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="agencyName" className="block text-sm font-medium text-slate-700">
                      Nom de l'agence
                    </label>
                    <input
                      type="text"
                      id="agencyName"
                      name="agencyName"
                      value={formData.agencyName}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                      placeholder="Acme Staffing"
                    />
                  </div>

                  <div>
                    <label htmlFor="agencySlug" className="block text-sm font-medium text-slate-700">
                      URL de l'agence
                    </label>
                    <div className="mt-1 flex rounded-lg shadow-sm">
                      <input
                        type="text"
                        id="agencySlug"
                        name="agencySlug"
                        value={formData.agencySlug}
                        onChange={handleChange}
                        className="flex-1 block w-full px-3 py-2 border border-slate-300 rounded-l-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                        placeholder="acme-staffing"
                      />
                      <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                        .questhire.com
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Lettres minuscules, chiffres et tirets uniquement
                    </p>
                  </div>

                  <div>
                    <label htmlFor="agencyEmail" className="block text-sm font-medium text-slate-700">
                      Email de contact de l'agence
                    </label>
                    <input
                      type="email"
                      id="agencyEmail"
                      name="agencyEmail"
                      value={formData.agencyEmail}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                      placeholder="contact@acme-staffing.com"
                    />
                  </div>
                </div>
              </div>

              {/* User Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-700">
                  Votre compte
                </h3>

                <div>
                  <label htmlFor="userName" className="block text-sm font-medium text-slate-700">
                    Votre nom
                  </label>
                  <input
                    type="text"
                    id="userName"
                    name="userName"
                    value={formData.userName}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                    placeholder="Jean Dupont"
                  />
                </div>

                <div>
                  <label htmlFor="userEmail" className="block text-sm font-medium text-slate-700">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    id="userEmail"
                    name="userEmail"
                    value={formData.userEmail}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                    placeholder="jean@acme-staffing.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                    placeholder="••••••••"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Au moins 8 caractères avec majuscules, minuscules et chiffres
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formState === "submitting"}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formState === "submitting" ? "Création..." : "Créer le compte"}
              </button>

              <p className="text-xs text-center text-slate-500">
                En créant un compte, vous acceptez nos{" "}
                <a href="#" className="text-indigo-600 hover:text-indigo-500">
                  Conditions d'utilisation
                </a>{" "}
                et notre{" "}
                <a href="#" className="text-indigo-600 hover:text-indigo-500">
                  Politique de confidentialité
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
