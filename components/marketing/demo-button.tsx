"use client";

import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"; // Assuming shadcn button exists, if not I'll use standard HTML button to be safe like in the homepage

export function DemoButton({ 
  className, 
  variant = "primary",
  children 
}: { 
  className?: string, 
  variant?: "primary" | "outline",
  children?: React.ReactNode 
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleStartDemo() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = await res.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert(data.error || "Impossible de lancer la démo");
        setIsLoading(false);
      }
    } catch {
      alert("Une erreur est survenue");
      setIsLoading(false);
    }
  }

  const baseStyles = "inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/25",
    outline: "bg-transparent text-white border border-slate-700 hover:bg-slate-800"
  };

  return (
    <button
      onClick={handleStartDemo}
      disabled={isLoading}
      className={cn(baseStyles, variants[variant], className)}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Chargement...
        </>
      ) : (
        children || (
          <>
            <Zap className="w-5 h-5 mr-2" />
            Lancer la démo interactive
          </>
        )
      )}
    </button>
  );
}
