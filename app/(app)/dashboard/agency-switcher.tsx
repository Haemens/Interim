"use client";

import { useState } from "react";

interface AgencySwitcherProps {
  currentAgency: {
    name: string;
    slug: string;
  };
  memberships: {
    name: string;
    slug: string;
    role: string;
  }[];
}

export function AgencySwitcher({ currentAgency, memberships }: AgencySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleSwitch(slug: string) {
    if (slug === currentAgency.slug) {
      setIsOpen(false);
      return;
    }

    // Build the URL for the new agency
    const protocol = window.location.protocol;
    const host = window.location.host;

    let newUrl: string;
    if (host.includes("localhost")) {
      newUrl = `${protocol}//${slug}.localhost:3000/dashboard`;
    } else {
      const parts = host.split(".");
      const domain = parts.slice(-2).join(".");
      newUrl = `${protocol}//${slug}.${domain}/dashboard`;
    }

    window.location.href = newUrl;
  }

  if (memberships.length <= 1) {
    // Only one agency, show static display
    return (
      <div className="bg-slate-50 rounded-lg px-3 py-2">
        <p className="text-xs text-slate-500">Current workspace</p>
        <p className="font-medium text-slate-900 truncate">{currentAgency.name}</p>
        <p className="text-xs text-slate-500">{currentAgency.slug}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 rounded-lg px-3 py-2 text-left hover:bg-slate-100 transition-colors"
      >
        <p className="text-xs text-slate-500">Current workspace</p>
        <div className="flex items-center justify-between">
          <p className="font-medium text-slate-900 truncate">{currentAgency.name}</p>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <p className="text-xs text-slate-500">{currentAgency.slug}</p>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden">
            <div className="py-1">
              {memberships.map((m) => (
                <button
                  key={m.slug}
                  onClick={() => handleSwitch(m.slug)}
                  className={`w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                    m.slug === currentAgency.slug ? "bg-indigo-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 truncate">{m.name}</p>
                    {m.slug === currentAgency.slug && (
                      <svg
                        className="w-4 h-4 text-indigo-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{m.role}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
