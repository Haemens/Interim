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
          Create your agency
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {formState === "success" ? (
            <div className="text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Account Created!
              </h2>
              <p className="text-slate-600">
                Redirecting you to your dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Agency Section */}
              <div className="border-b border-slate-200 pb-5">
                <h3 className="text-sm font-medium text-slate-700 mb-4">
                  Agency Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="agencyName" className="block text-sm font-medium text-slate-700">
                      Agency Name
                    </label>
                    <input
                      type="text"
                      id="agencyName"
                      name="agencyName"
                      value={formData.agencyName}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Acme Staffing"
                    />
                  </div>

                  <div>
                    <label htmlFor="agencySlug" className="block text-sm font-medium text-slate-700">
                      Agency URL
                    </label>
                    <div className="mt-1 flex rounded-lg shadow-sm">
                      <input
                        type="text"
                        id="agencySlug"
                        name="agencySlug"
                        value={formData.agencySlug}
                        onChange={handleChange}
                        className="flex-1 block w-full px-3 py-2 border border-slate-300 rounded-l-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="acme-staffing"
                      />
                      <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                        .questhire.com
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Lowercase letters, numbers, and hyphens only
                    </p>
                  </div>

                  <div>
                    <label htmlFor="agencyEmail" className="block text-sm font-medium text-slate-700">
                      Agency Contact Email
                    </label>
                    <input
                      type="email"
                      id="agencyEmail"
                      name="agencyEmail"
                      value={formData.agencyEmail}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="contact@acme-staffing.com"
                    />
                  </div>
                </div>
              </div>

              {/* User Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-700">
                  Your Account
                </h3>

                <div>
                  <label htmlFor="userName" className="block text-sm font-medium text-slate-700">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="userName"
                    name="userName"
                    value={formData.userName}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="userEmail" className="block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="userEmail"
                    name="userEmail"
                    value={formData.userEmail}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="john@acme-staffing.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="••••••••"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    At least 8 characters with uppercase, lowercase, and numbers
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formState === "submitting"}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formState === "submitting" ? "Creating account..." : "Create Account"}
              </button>

              <p className="text-xs text-center text-slate-500">
                By creating an account, you agree to our{" "}
                <a href="#" className="text-indigo-600 hover:text-indigo-500">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-indigo-600 hover:text-indigo-500">
                  Privacy Policy
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
