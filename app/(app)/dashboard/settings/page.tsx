"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "branding" | "notifications">("general");

  const tabs = [
    { key: "general", label: "Général" },
    { key: "branding", label: "Marque" },
    { key: "notifications", label: "Notifications" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-600 mt-1">
          Gérez les paramètres et préférences de votre agence.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {activeTab === "general" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Informations de l&apos;agence
              </h3>
              <div className="grid gap-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nom de l&apos;agence
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Votre agence"
                    disabled
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Contactez le support pour modifier le nom de votre agence.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Identifiant (Slug)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                    disabled
                    placeholder="votre-agence"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Utilisé dans l&apos;URL de votre agence.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Zone de danger
              </h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800">Supprimer l&apos;agence</h4>
                <p className="text-sm text-red-600 mt-1">
                  La suppression est irréversible. Veuillez être certain de votre choix.
                </p>
                <button
                  className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  disabled
                >
                  Supprimer l&apos;agence
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "branding" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Couleurs de la marque
              </h3>
              <div className="grid gap-4 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Couleur principale
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
                      defaultValue="#4F46E5"
                    />
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="#4F46E5"
                      defaultValue="#4F46E5"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Logo</h3>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <div className="text-slate-400 mb-2">
                  <svg
                    className="w-10 h-10 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">
                  Glissez-déposez votre logo ici, ou cliquez pour parcourir
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  PNG, JPG jusqu&apos;à 2MB
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                Enregistrer
              </button>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Notifications Email
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    defaultChecked
                  />
                  <span className="text-sm text-slate-700">
                    Nouvelle candidature reçue
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    defaultChecked
                  />
                  <span className="text-sm text-slate-700">
                    Feedback client reçu
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">
                    Rapport hebdomadaire
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                Enregistrer les préférences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
