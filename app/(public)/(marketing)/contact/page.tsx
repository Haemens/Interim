import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="pt-32 pb-20 lg:pt-40 lg:pb-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-6">Contactez-nous</h1>
              <p className="text-lg text-slate-600 mb-8">
                Une question sur nos offres ? Besoin d'une démo personnalisée ? 
                Notre équipe est là pour vous répondre.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-medium mb-1">Email</h3>
                    <a href="mailto:contact@interim.ai" className="text-slate-600 hover:text-indigo-600 transition-colors">contact@interim.ai</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-medium mb-1">Téléphone</h3>
                    <p className="text-slate-600">+33 1 23 45 67 89</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-medium mb-1">Bureaux</h3>
                    <p className="text-slate-600">
                      10 rue de la Paix<br />
                      75002 Paris, France
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg shadow-slate-200/50">
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium text-slate-700">Prénom</label>
                    <input
                      type="text"
                      id="firstName"
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                      placeholder="Jean"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium text-slate-700">Nom</label>
                    <input
                      type="text"
                      id="lastName"
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                      placeholder="Dupont"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">Email professionnel</label>
                  <input
                    type="email"
                    id="email"
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                    placeholder="jean@agence.com"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium text-slate-700">Message</label>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
                    placeholder="Bonjour, je souhaiterais..."
                  ></textarea>
                </div>
                <button
                  type="button" // Static for now
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                >
                  Envoyer le message
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
  );
}
