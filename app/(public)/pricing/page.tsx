import Link from "next/link";
import { Check } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans">
      <main className="pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
            Des tarifs simples et <span className="text-indigo-400">transparents</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Choisissez le plan adapté à la taille de votre agence. Aucun frais caché.
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col">
              <h3 className="text-xl font-semibold text-white mb-2">Starter</h3>
              <p className="text-slate-400 text-sm mb-6">Pour démarrer votre activité</p>
              <div className="mb-8">
                <span className="text-4xl font-bold text-white">29€</span>
                <span className="text-slate-500">/mois</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <PricingItem text="Jusqu'à 10 offres actives" />
                <PricingItem text="Pipeline candidats basique" />
                <PricingItem text="1 utilisateur" />
                <PricingItem text="Support par email" />
              </ul>
              <Link
                href="/signup"
                className="w-full block text-center py-3 rounded-lg font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors"
              >
                Commencer
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-indigo-900/20 border border-indigo-500/50 rounded-2xl p-8 flex flex-col relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Populaire
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
              <p className="text-slate-400 text-sm mb-6">Pour les agences en croissance</p>
              <div className="mb-8">
                <span className="text-4xl font-bold text-white">79€</span>
                <span className="text-slate-500">/mois</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <PricingItem text="Offres illimitées" highlighted />
                <PricingItem text="Pipeline avancé & Shortlists" highlighted />
                <PricingItem text="Pack Social IA inclus" highlighted />
                <PricingItem text="Jusqu'à 5 utilisateurs" />
                <PricingItem text="Portail client" />
              </ul>
              <Link
                href="/signup"
                className="w-full block text-center py-3 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/25"
              >
                Essayer gratuitement
              </Link>
            </div>

            {/* Agency+ */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col">
              <h3 className="text-xl font-semibold text-white mb-2">Agency+</h3>
              <p className="text-slate-400 text-sm mb-6">Pour les réseaux d'agences</p>
              <div className="mb-8">
                <span className="text-4xl font-bold text-white">199€</span>
                <span className="text-slate-500">/mois</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <PricingItem text="Tout illimité" />
                <PricingItem text="Multi-agences / Multi-sites" />
                <PricingItem text="API & Intégrations custom" />
                <PricingItem text="Support dédié prioritaire" />
                <PricingItem text="Formation des équipes" />
              </ul>
              <Link
                href="/contact"
                className="w-full block text-center py-3 rounded-lg font-medium bg-slate-800 text-white hover:bg-slate-700 transition-colors"
              >
                Nous contacter
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PricingItem({ text, highlighted }: { text: string, highlighted?: boolean }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${highlighted ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
        <Check className="w-3 h-3" />
      </div>
      <span className={highlighted ? "text-white font-medium" : "text-slate-300"}>{text}</span>
    </li>
  );
}
