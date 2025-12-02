import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  CheckCircle2, 
  ArrowRight, 
  BarChart3, 
  Users, 
  MessageSquare, 
  Share2, 
  LayoutDashboard, 
  ShieldCheck, 
  Zap,
  Briefcase,
  Building2,
  Clock,
  Search,
  MousePointerClick,
  Star
} from "lucide-react";

export default function HomePage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold">I</span>
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">Interim</span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/login" className="text-sm font-medium hover:text-white transition-colors">
              Connexion
            </Link>
            <Link
              href="/signup"
              className="hidden md:inline-flex bg-white text-slate-950 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
            >
              Essai gratuit
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 lg:pt-40 lg:pb-28 px-4 relative overflow-hidden">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -z-10" />
          
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Nouveau : Pack Social IA inclus
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight mb-6 text-balance">
              La plateforme tout-en-un pour vos <span className="text-indigo-400">missions d&apos;intérim</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 text-balance">
              Gérez vos recrutements, collaborez avec vos clients et diffusez vos offres en un clic. 
              Une solution pensée pour la rapidité des agences et des PME.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/demo"
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Lancer la démo interactive
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white border border-slate-800 rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                Parler à un expert
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                Pas de carte requise
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                En moins de 2 minutes
              </span>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="max-w-5xl mx-auto mt-20 relative">
            <div className="absolute -inset-1 bg-gradient-to-b from-indigo-500 to-transparent opacity-20 blur-2xl rounded-2xl" />
            <div className="relative bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden aspect-[16/9] group">
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] group-hover:backdrop-blur-0 transition-all z-10 flex items-center justify-center">
                <span className="bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-lg text-sm font-medium text-white backdrop-blur-md group-hover:opacity-0 transition-opacity duration-500">
                  Aperçu du Dashboard
                </span>
              </div>
              
              {/* Fake UI */}
              <div className="p-6 h-full flex flex-col gap-6 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex gap-4">
                    <div className="w-32 h-8 bg-slate-800 rounded-md animate-pulse" />
                    <div className="w-24 h-8 bg-slate-800/50 rounded-md" />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full" />
                  </div>
                </div>
                <div className="flex gap-6 h-full">
                  <div className="w-64 flex-shrink-0 bg-slate-800/30 rounded-lg border border-slate-800/50 p-4 space-y-3">
                    <div className="flex justify-between items-center mb-4">
                      <div className="w-20 h-4 bg-slate-700 rounded" />
                      <div className="w-6 h-4 bg-slate-700 rounded-full" />
                    </div>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-slate-800 p-3 rounded border border-slate-700 space-y-2">
                        <div className="w-3/4 h-4 bg-slate-700 rounded" />
                        <div className="w-1/2 h-3 bg-slate-700/50 rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="w-64 flex-shrink-0 bg-slate-800/30 rounded-lg border border-slate-800/50 p-4 space-y-3">
                    <div className="flex justify-between items-center mb-4">
                      <div className="w-20 h-4 bg-slate-700 rounded" />
                      <div className="w-6 h-4 bg-slate-700 rounded-full" />
                    </div>
                    {[1, 2].map(i => (
                      <div key={i} className="bg-slate-800 p-3 rounded border border-slate-700 space-y-2">
                        <div className="w-3/4 h-4 bg-slate-700 rounded" />
                        <div className="w-1/2 h-3 bg-slate-700/50 rounded" />
                        <div className="flex gap-1 mt-2">
                          <div className="w-12 h-4 bg-indigo-900/50 rounded text-[10px] flex items-center justify-center text-indigo-300">Qualifié</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 bg-slate-800/30 rounded-lg border border-slate-800/50 p-4">
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <BarChart3 className="w-12 h-12 opacity-20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Segmentation */}
        <section className="py-12 border-y border-slate-800 bg-slate-900/50">
          <div className="max-w-6xl mx-auto px-4 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex items-start gap-4 hover:border-indigo-500/30 transition-colors cursor-default">
                <div className="p-3 bg-indigo-500/10 rounded-lg">
                  <Briefcase className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Je suis une agence d&apos;intérim</h3>
                  <p className="text-slate-400 text-sm mb-4">Gérez plusieurs clients, viviers de talents et pipelines en parallèle.</p>
                  <ul className="space-y-2 text-sm text-slate-500 mb-4">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Vivier centralisé</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Vue multi-clients</li>
                  </ul>
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex items-start gap-4 hover:border-indigo-500/30 transition-colors cursor-default">
                <div className="p-3 bg-indigo-500/10 rounded-lg">
                  <Building2 className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Je suis une PME</h3>
                  <p className="text-slate-400 text-sm mb-4">Recrutez rapidement pour vos pics d&apos;activité sans complexité.</p>
                  <ul className="space-y-2 text-sm text-slate-500 mb-4">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Diffusion rapide</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Feedback simple</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-16 text-center">
          <div className="max-w-6xl mx-auto px-4 lg:px-8">
            <p className="text-sm font-medium text-slate-500 mb-8">ILS NOUS FONT CONFIANCE</p>
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {["TechStaff", "InterimPro", "BatimentExpress", "Logistique24", "ServicePlus"].map((name) => (
                <span key={name} className="text-xl font-bold text-slate-300">{name}</span>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-slate-900">
          <div className="max-w-6xl mx-auto px-4 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-4">Comment ça marche ?</h2>
              <p className="text-slate-400">De la mission à la paie en 3 étapes simples</p>
            </div>
            <div className="grid md:grid-cols-3 gap-12 relative">
              <div className="absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-900 to-transparent hidden md:block" />
              
              <Step 
                number="1" 
                title="Publiez votre besoin" 
                desc="Créez une offre en 2 minutes. Notre IA génère automatiquement les posts pour vos réseaux sociaux."
              />
              <Step 
                number="2" 
                title="Gérez le pipeline" 
                desc="Recevez les candidatures, qualifiez-les et déplacez-les dans votre Kanban visuel."
              />
              <Step 
                number="3" 
                title="Validez et placez" 
                desc="Partagez une shortlist avec le client, obtenez son feedback et confirmez la mission."
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-4 lg:px-8">
            <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium">
                  <LayoutDashboard className="w-4 h-4" />
                  Pipeline & Kanban
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Une vue claire sur chaque mission
                </h2>
                <p className="text-lg text-slate-400">
                  Fini les feuilles Excel. Visualisez l&apos;avancement de chaque candidat, 
                  créez des shortlists en un clic et ne perdez plus jamais un bon profil.
                </p>
                <ul className="space-y-4">
                  <FeaturePoint text="Drag & drop intuitif" />
                  <FeaturePoint text="Filtres par compétences et statuts" />
                  <FeaturePoint text="Historique complet des actions" />
                </ul>
              </div>
              <div className="bg-gradient-to-tr from-slate-800 to-slate-900 p-1 rounded-2xl shadow-2xl">
                <div className="bg-slate-950 rounded-xl overflow-hidden h-80 flex items-center justify-center relative">
                  {/* Placeholder UI */}
                  <div className="absolute inset-0 flex gap-4 p-6 overflow-hidden opacity-80">
                    {[1, 2, 3].map(col => (
                      <div key={col} className="w-1/3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col gap-3 p-3">
                        <div className="h-4 w-20 bg-slate-800 rounded mb-2" />
                        <div className="h-24 bg-slate-800 rounded border border-slate-700/50" />
                        <div className="h-24 bg-slate-800 rounded border border-slate-700/50" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
              <div className="order-2 md:order-1 bg-gradient-to-tl from-indigo-900/20 to-slate-900 p-1 rounded-2xl shadow-2xl">
                <div className="bg-slate-950 rounded-xl overflow-hidden h-80 flex items-center justify-center relative">
                  <div className="absolute inset-0 p-8 flex flex-col items-center justify-center text-center">
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 max-w-xs w-full">
                      <div className="w-12 h-12 bg-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Share2 className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-white font-semibold mb-2">Lien de validation</h4>
                      <p className="text-xs text-slate-500 mb-4">Envoyé à client@entreprise.com</p>
                      <div className="h-2 bg-slate-800 rounded w-full mb-2" />
                      <div className="h-2 bg-slate-800 rounded w-2/3 mx-auto" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium">
                  <Users className="w-4 h-4" />
                  Collaboration Client
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Impliquez vos clients sans friction
                </h2>
                <p className="text-lg text-slate-400">
                  Envoyez des shortlists interactives. Vos clients valident les profils 
                  ou laissent des feedbacks directement sur la plateforme. Plus d&apos;emails perdus.
                </p>
                <ul className="space-y-4">
                  <FeaturePoint text="Liens publics sécurisés" />
                  <FeaturePoint text="Feedback en temps réel" />
                  <FeaturePoint text="Portail client dédié" />
                </ul>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Share2 className="w-6 h-6" />}
                title="Pack Social IA"
                desc="Générez posts LinkedIn, scripts TikTok et messages WhatsApp pour chaque offre."
              />
              <FeatureCard 
                icon={<ShieldCheck className="w-6 h-6" />}
                title="Conformité RGPD"
                desc="Gestion automatique des consentements candidats et sécurisation des données."
              />
              <FeatureCard 
                icon={<BarChart3 className="w-6 h-6" />}
                title="Analytics Complets"
                desc="Suivez vos KPIs : temps de placement, sources les plus performantes, marges."
              />
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-20 bg-indigo-950 border-y border-indigo-900/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay"></div>
          <div className="max-w-6xl mx-auto px-4 lg:px-8 relative z-10">
            <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-indigo-900">
              <div className="p-4">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">-40%</div>
                <div className="text-indigo-200 font-medium">de temps administratif</div>
              </div>
              <div className="p-4">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">x2.5</div>
                <div className="text-indigo-200 font-medium">candidats qualifiés</div>
              </div>
              <div className="p-4">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">24h</div>
                <div className="text-indigo-200 font-medium">temps moyen de placement</div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24">
          <div className="max-w-3xl mx-auto px-4 lg:px-8">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Questions fréquentes</h2>
            <div className="space-y-6">
              <FaqItem 
                q="Est-ce que cela remplace mon ATS actuel ?" 
                a="Interim est conçu pour être un ATS complet pour l'intérim. Vous pouvez l'utiliser seul ou en complément pour la gestion spécifique des missions courtes." 
              />
              <FaqItem 
                q="Puis-je importer ma base de candidats ?" 
                a="Oui, nous proposons des outils d'import CSV et CVthèque pour migrer vos données en quelques minutes." 
              />
              <FaqItem 
                q="Est-ce qu'il y a un engagement ?" 
                a="Non, nos offres sont sans engagement. Vous pouvez arrêter à tout moment." 
              />
              <FaqItem 
                q="Le mode démo est-il payant ?" 
                a="Le mode démo est 100% gratuit et accessible instantanément sans carte bancaire. Il vous permet de tester l'interface avec des données fictives." 
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-4">
          <div className="max-w-4xl mx-auto bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 md:p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/5 blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Prêt à accélérer vos recrutements ?
              </h2>
              <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
                Rejoignez les agences modernes qui ont choisi Interim pour leur croissance.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
                >
                  Commencer maintenant
                </Link>
                <Link
                  href="/demo"
                  className="w-full sm:w-auto px-8 py-4 bg-transparent text-white border border-slate-700 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
                >
                  Lancer la démo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-xs font-bold text-white">I</div>
              <span className="text-slate-300 font-semibold">Interim</span>
            </div>
            <div className="flex gap-8 text-sm text-slate-500">
              <Link href="#" className="hover:text-white transition-colors">Produit</Link>
              <Link href="#" className="hover:text-white transition-colors">Tarifs</Link>
              <Link href="#" className="hover:text-white transition-colors">Contact</Link>
              <Link href="#" className="hover:text-white transition-colors">Mentions légales</Link>
            </div>
            <div className="text-sm text-slate-600">
              © {currentYear} Interim by QuestHire.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Components

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl hover:border-indigo-500/30 transition-colors">
      <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="relative z-10 flex flex-col items-center text-center">
      <div className="w-12 h-12 bg-slate-950 border-4 border-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-6 shadow-xl shadow-indigo-900/20">
        {number}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed max-w-xs">{desc}</p>
    </div>
  );
}

function FeaturePoint({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 text-slate-300">
      <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-3 h-3 text-indigo-400" />
      </div>
      {text}
    </li>
  );
}

function FaqItem({ q, a }: { q: string, a: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h4 className="text-lg font-semibold text-white mb-2">{q}</h4>
      <p className="text-slate-400 text-sm leading-relaxed">{a}</p>
    </div>
  );
}
