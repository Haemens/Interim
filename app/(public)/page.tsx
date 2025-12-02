"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_NAME } from "@/config/constants";

export default function LandingPage() {
  const [isStartingDemo, setIsStartingDemo] = useState(false);

  async function handleStartDemo() {
    setIsStartingDemo(true);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert(data.error || "Failed to start demo");
        setIsStartingDemo(false);
      }
    } catch {
      alert("Failed to start demo");
      setIsStartingDemo(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <span className="text-xl font-bold text-slate-900">{APP_NAME}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-16 text-center lg:pt-32">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            Designed for temp & staffing agencies
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Fill jobs faster with a
            <br />
            <span className="text-indigo-600">talent pool that never sleeps.</span>
          </h1>
          <p className="mt-6 text-xl leading-8 text-slate-600 max-w-3xl mx-auto">
            QuestHire helps staffing agencies publish social-first job ads, 
            track candidates by job in a visual pipeline, and reuse every profile 
            for the next mission.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/25 text-lg"
            >
              Start your free trial
            </Link>
            <button
              onClick={handleStartDemo}
              disabled={isStartingDemo}
              className="w-full sm:w-auto text-slate-700 px-8 py-4 rounded-xl font-semibold hover:bg-slate-100 transition-colors border border-slate-200 text-lg disabled:opacity-50"
            >
              {isStartingDemo ? "Loading demo..." : "View live demo →"}
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-500">No credit card required.</p>
        </div>
      </section>

      {/* Problem Section */}
      <section className="border-y border-slate-200 bg-slate-50/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Why staffing agencies lose time today
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon="📧"
              title="Offers scattered everywhere"
              description="Jobboards, emails, WhatsApp, Excel… You lose information at every step."
            />
            <ProblemCard
              icon="👻"
              title="Candidates forgotten after the first mission"
              description="You submit a great profile, they don't get picked… and they disappear into a folder."
            />
            <ProblemCard
              icon="❓"
              title="No clear pipeline per job"
              description="Hard to answer simply: 'Where is this mission at? Who's placed? Who can we call back?'"
            />
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            What QuestHire does for you
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <SolutionCard
            icon="⚡"
            title="Create and publish offers in minutes"
            features={[
              "Centralised job form (title, location, contract, salary, benefits)",
              "Beautiful job page + assets for social media",
              "All applications arrive in one place"
            ]}
          />
          <SolutionCard
            icon="📋"
            title="Visual pipeline per job"
            features={[
              "Kanban board: NEW → CONTACTED → QUALIFIED → PLACED",
              "Drag & drop candidates between columns",
              "Action history per job (timeline)"
            ]}
          />
          <SolutionCard
            icon="🎯"
            title="Reusable talent pool"
            features={[
              "Every application creates a Candidate Profile",
              "Search by sector, skills, tags, status",
              "Auto-suggest matching candidates for new jobs"
            ]}
          />
          <SolutionCard
            icon="📊"
            title="Analytics & billing for agencies"
            features={[
              "Active jobs, applications, potential placements",
              "Top jobs by candidate volume",
              "Starter / Pro / Agency+ plans via Stripe"
            ]}
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-900 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
            <p className="mt-4 text-lg text-slate-400">
              From signup to placement in 3 steps
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Create your agency & first job"
              description="In 5 minutes, you have your account, your agency, your first job published and a job page ready to share."
            />
            <StepCard
              number="2"
              title="Collect and centralise applications"
              description="Candidates apply via the job page with CV upload and GDPR consent. You see everything by job and by candidate."
            />
            <StepCard
              number="3"
              title="Place faster with your talent pool"
              description="When a new mission comes in, filter your pool, drag the right candidates to 'PLACED' and notify them."
            />
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Simple pricing for busy agencies</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PricingCard
            name="Starter"
            price="€29"
            period="/month"
            description="Ideal to test QuestHire in one branch"
            features={[
              "Up to 10 active jobs",
              "Pipelines per job",
              "Talent pool & analytics",
              "Team management"
            ]}
          />
          <PricingCard
            name="Pro"
            price="€79"
            period="/month"
            description="For growing agencies"
            features={[
              "Unlimited active jobs",
              "Shortlists & share links",
              "Candidate matching & emails",
              "Full analytics"
            ]}
            highlighted
          />
          <PricingCard
            name="Agency+"
            price="€199"
            period="/month"
            description="For networks & large players"
            features={[
              "Multi-agency / group",
              "Priority support & onboarding",
              "Custom integrations",
              "Everything in Pro"
            ]}
          />
        </div>
        <div className="text-center mt-8">
          <p className="text-sm text-slate-500">Compare plans inside the app</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-600 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to stop losing good candidates?
          </h2>
          <p className="mt-4 text-lg text-indigo-100">
            Start building your talent pool today.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold hover:bg-indigo-50 transition-colors text-lg"
            >
              Start free trial
            </Link>
            <button
              onClick={handleStartDemo}
              disabled={isStartingDemo}
              className="w-full sm:w-auto text-white px-8 py-4 rounded-xl font-semibold hover:bg-indigo-500 transition-colors border border-white/30 text-lg disabled:opacity-50"
            >
              {isStartingDemo ? "Loading..." : "View live demo"}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Q</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{APP_NAME}</span>
              </div>
              <p className="text-sm text-slate-600">
                Multi-tenant ATS for staffing agencies
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="/signup" className="hover:text-slate-900">Sign up</Link></li>
                <li><Link href="/login" className="hover:text-slate-900">Log in</Link></li>
                <li><button onClick={handleStartDemo} className="hover:text-slate-900">Live demo</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="https://github.com" className="hover:text-slate-900">Documentation</a></li>
                <li><a href="mailto:support@questhire.com" className="hover:text-slate-900">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="/privacy" className="hover:text-slate-900">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-slate-900">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 mt-12 pt-8 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

// =============================================================================
// COMPONENTS
// =============================================================================

function ProblemCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="text-center p-6 bg-white rounded-xl border border-slate-200">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
    </div>
  );
}

function SolutionCard({ icon, title, features }: { icon: string; title: string; features: string[] }) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:border-indigo-200 hover:shadow-lg transition-all">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      </div>
      <ul className="space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-indigo-600 mt-0.5">✓</span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-white font-bold text-lg">{number}</span>
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  highlighted,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-8 ${
        highlighted
          ? "bg-indigo-600 text-white ring-4 ring-indigo-600 ring-offset-4"
          : "bg-white border border-slate-200"
      }`}
    >
      <h3 className={`text-lg font-semibold ${highlighted ? "text-white" : "text-slate-900"}`}>{name}</h3>
      <p className={`text-sm mt-1 ${highlighted ? "text-indigo-100" : "text-slate-500"}`}>{description}</p>
      <div className="mt-6 mb-8">
        <span className="text-4xl font-bold">{price}</span>
        <span className={highlighted ? "text-indigo-100" : "text-slate-500"}>{period}</span>
      </div>
      <ul className="space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm">
            <span className={highlighted ? "text-indigo-200" : "text-indigo-600"}>✓</span>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`mt-8 block text-center py-3 rounded-lg font-medium transition-colors ${
          highlighted
            ? "bg-white text-indigo-600 hover:bg-indigo-50"
            : "bg-slate-100 text-slate-900 hover:bg-slate-200"
        }`}
      >
        Get started
      </Link>
    </div>
  );
}
