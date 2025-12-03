import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Search, FileText, Send, CheckCircle, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Comment ça marche - QuestHire",
  description: "Découvrez comment trouver votre prochain emploi simplement avec QuestHire.",
};

export default function HowItWorksPage() {
  return (
    <div className="bg-white min-h-screen pt-24 pb-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl mb-6">
            Trouver un job n'a jamais été aussi simple
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Que vous cherchiez une mission d'intérim ou un CDI, QuestHire connecte directement 
            les candidats aux meilleures agences de recrutement.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/jobs">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8">
                Voir les offres
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-indigo-100 z-0" />

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-white border-4 border-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                <Search className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">1. Cherchez</h3>
            <p className="text-slate-600">
              Parcourez des milliers d'offres par secteur, localisation et type de contrat. 
              Nos filtres vous aident à trouver exactement ce qui vous correspond.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-white border-4 border-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                <FileText className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">2. Postulez</h3>
            <p className="text-slate-600">
              Créez votre profil en quelques minutes. Importez votre CV une seule fois 
              et postulez à autant d'offres que vous le souhaitez en un clic.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-white border-4 border-indigo-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                <CheckCircle className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">3. Travaillez</h3>
            <p className="text-slate-600">
              Échangez directement avec les agences via notre messagerie. 
              Recevez des propositions et signez vos contrats rapidement.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Preview or CTA */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Prêt à commencer ?</h2>
          <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers de candidats qui ont trouvé leur prochain emploi grâce à QuestHire.
            L'inscription est 100% gratuite.
          </p>
          <Link href="/login?type=candidate">
            <Button size="lg" variant="outline" className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-full px-8">
              Créer un compte candidat
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
