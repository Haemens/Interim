"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

type FormState = "idle" | "submitting" | "error";

function LoginForm() {
  const searchParams = useSearchParams();
  const [formState, setFormState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRegisteredMessage, setShowRegisteredMessage] = useState(false);

  useEffect(() => {
    // Check for registration success
    if (searchParams.get("registered") === "true") {
      setShowRegisteredMessage(true);
      const emailParam = searchParams.get("email");
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState("submitting");
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setFormState("error");
        return;
      }

      // Get user's memberships to find where to redirect
      const membershipsRes = await fetch("/api/auth/memberships");
      
      if (!membershipsRes.ok) {
        // Fallback: redirect to main domain
        window.location.href = "/dashboard";
        return;
      }

      const { memberships } = await membershipsRes.json();

      if (memberships && memberships.length > 0) {
        // Redirect to the first agency's dashboard
        const firstAgency = memberships[0];
        const host = window.location.host;

        let dashboardUrl: string;
        
        // Check if we're on localhost
        if (host.includes("localhost")) {
          dashboardUrl = `http://${firstAgency.slug}.localhost:3000/dashboard`;
        } 
        // Check if we're on Vercel (no subdomain support without custom domain)
        else if (host.includes("vercel.app")) {
          // On Vercel without custom domain, just go to /dashboard
          // The app will need to handle tenant selection differently
          dashboardUrl = "/dashboard";
        }
        // Custom domain with subdomain support
        else {
          const protocol = "https";
          const parts = host.split(".");
          const domain = parts.slice(-2).join(".");
          dashboardUrl = `${protocol}://${firstAgency.slug}.${domain}/dashboard`;
        }

        window.location.href = dashboardUrl;
      } else {
        // No memberships, redirect to create agency
        window.location.href = "/signup";
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setFormState("error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-slate-900">
          Connexion à QuestHire
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="text-indigo-600 hover:text-indigo-500 font-medium">
            Créer un compte
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-xl sm:px-10 border border-slate-200">
          {showRegisteredMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
              Compte créé avec succès ! Veuillez vous connecter.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error === "Invalid email or password" ? "Email ou mot de passe incorrect" : "Une erreur est survenue. Veuillez réessayer."}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Adresse email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                placeholder="vous@exemple.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded bg-white"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-slate-700">
                  Se souvenir de moi
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="text-indigo-600 hover:text-indigo-500">
                  Mot de passe oublié ?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={formState === "submitting"}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formState === "submitting" ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Chargement...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
