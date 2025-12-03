import { PublicFooter } from "../components/public-footer";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mentions Légales & Confidentialité</h1>
          <p className="text-slate-500">Dernière mise à jour : {new Date().toLocaleDateString()}</p>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-4 py-12 flex-grow w-full">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-8">
            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">1. Présentation</h2>
                <p className="text-slate-600 leading-relaxed">
                    Le service QuestHire est une plateforme SaaS destinée aux agences d'intérim et de recrutement. 
                    Chaque agence utilisant ce service agit en tant que Responsable de Traitement pour les données de ses candidats.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">2. Protection des Données (RGPD)</h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                    Nous accordons une importance capitale à la confidentialité de vos données. Les informations collectées via les formulaires de candidature sont destinées exclusivement aux processus de recrutement.
                </p>
                <h3 className="font-semibold text-slate-900 mb-2">Vos droits :</h3>
                <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2">
                    <li>Droit d'accès à vos données</li>
                    <li>Droit de rectification</li>
                    <li>Droit à l'effacement ("Droit à l'oubli")</li>
                    <li>Droit à la portabilité</li>
                </ul>
                <p className="text-slate-600 mt-4 text-sm">
                    Pour exercer ces droits, veuillez contacter directement l'agence concernée via les coordonnées fournies sur leurs offres d'emploi ou leur page profil.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">3. Hébergement</h2>
                <p className="text-slate-600 leading-relaxed">
                    Ce site est hébergé sur l'infrastructure cloud de Vercel Inc.<br/>
                    Stockage des données : Union Européenne (AWS/Neon).
                </p>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4">4. Cookies</h2>
                <p className="text-slate-600 leading-relaxed">
                    Nous utilisons uniquement des cookies techniques strictement nécessaires au fonctionnement du service (session, sécurité). Aucun traceur publicitaire tiers n'est utilisé sans votre consentement explicite.
                </p>
            </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
