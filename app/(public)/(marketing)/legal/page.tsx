export default function LegalPage() {
  return (
    <main className="pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="max-w-3xl mx-auto px-4 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">Mentions Légales</h1>
          
          <div className="space-y-8 text-slate-400">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Éditeur du site</h2>
              <p>
                Le site Interim est édité par la société QuestHire SAS, au capital de 10 000 euros, 
                immatriculée au Registre du Commerce et des Sociétés de Paris sous le numéro 123 456 789.
              </p>
              <p className="mt-2">
                Siège social : 10 rue de la Paix, 75002 Paris, France.<br />
                Directeur de la publication : John Doe.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Hébergement</h2>
              <p>
                Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133 Walnut, CA 91789, USA.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Propriété intellectuelle</h2>
              <p>
                L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. 
                Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Données personnelles</h2>
              <p>
                Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression des données vous concernant. 
                Vous pouvez exercer ce droit en nous contactant à l'adresse : privacy@interim.ai.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Cookies</h2>
              <p>
                Ce site utilise des cookies pour améliorer l'expérience utilisateur et réaliser des statistiques de visites. 
                Vous pouvez configurer vos préférences dans les paramètres de votre navigateur.
              </p>
            </section>
          </div>
        </div>
      </main>
  );
}
