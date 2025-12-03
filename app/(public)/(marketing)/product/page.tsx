import Link from "next/link";
import { CheckCircle2, LayoutDashboard, Users, BarChart3, Zap, Share2, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Produit - QuestHire",
  description: "Découvrez les fonctionnalités de QuestHire pour les agences d'intérim.",
};

export default function ProductPage() {
  return (
    <main className="bg-white pt-32 pb-20 lg:pt-40 lg:pb-28 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-50 rounded-full blur-[100px] -z-10" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-50 rounded-full blur-[80px] -z-10 opacity-50" />

        <div className="max-w-6xl mx-auto px-4 lg:px-8 text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6">
            Tout ce dont vous avez besoin pour <span className="text-indigo-600">piloter votre agence</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Une suite complète d'outils pour sourcer, qualifier et placer vos intérimaires plus rapidement.
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 lg:px-8 space-y-24">
          {/* Feature 1 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium">
                <LayoutDashboard className="w-4 h-4" />
                Gestion des missions
              </div>
              <h2 className="text-3xl font-bold text-slate-900">Pipeline Visuel & Kanban</h2>
              <p className="text-lg text-slate-600">
                Visualisez l'état de chaque recrutement en un coup d'œil. Glissez-déposez les candidats
                d'une étape à l'autre et ne perdez plus jamais le fil d'une mission.
              </p>
              <ul className="space-y-3">
                <FeatureItem text="Vue Kanban personnalisable" />
                <FeatureItem text="Filtres avancés par compétences" />
                <FeatureItem text="Historique complet des actions" />
              </ul>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 aspect-video flex items-center justify-center shadow-sm">
              <div className="text-slate-400 italic">Interface Pipeline</div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-slate-50 border border-slate-200 rounded-xl p-8 aspect-video flex items-center justify-center shadow-sm">
              <div className="text-slate-400 italic">Interface Portail Client</div>
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-sm font-medium">
                <Users className="w-4 h-4" />
                Portail Client
              </div>
              <h2 className="text-3xl font-bold text-slate-900">Collaboration Client 360°</h2>
              <p className="text-lg text-slate-600">
                Donnez à vos clients un accès dédié pour valider les profils, déposer leurs besoins
                et suivre leurs missions en temps réel.
              </p>
              <ul className="space-y-3">
                <FeatureItem text="Validation de CVs en ligne" />
                <FeatureItem text="Dépôt de demandes de mission" />
                <FeatureItem text="Feedback instantané" />
              </ul>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium">
                <Share2 className="w-4 h-4" />
                Diffusion & Marketing
              </div>
              <h2 className="text-3xl font-bold text-slate-900">Générateur de Contenu Social</h2>
              <p className="text-lg text-slate-600">
                Notre IA rédige pour vous des posts LinkedIn, Instagram et TikTok optimisés pour
                attirer les meilleurs candidats.
              </p>
              <ul className="space-y-3">
                <FeatureItem text="Génération en 1 clic" />
                <FeatureItem text="Adapté à chaque réseau social" />
                <FeatureItem text="Bibliothèque de templates" />
              </ul>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 aspect-video flex items-center justify-center shadow-sm">
              <div className="text-slate-400 italic">Interface Social Content</div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto text-center mt-24 px-4">
          <Link
            href="/signup"
            className="inline-block bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Essayer gratuitement
          </Link>
        </div>
      </main>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 text-slate-600">
      <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
      {text}
    </li>
  );
}
