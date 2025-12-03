import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin } from "lucide-react";

export const metadata = {
  title: "Nos Agences Partenaires - QuestHire",
  description: "Découvrez les agences de recrutement partenaires de QuestHire.",
};

export default async function AgenciesPage() {
  // Fetch agencies (limit to 50 for now)
  const agencies = await db.agency.findMany({
    take: 50,
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { jobs: { where: { status: 'ACTIVE' } } }
      }
    }
  });

  return (
    <div className="bg-slate-50 min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-4">
            Nos Agences Partenaires
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Collaborez avec les meilleures agences d'intérim et de recrutement.
            Consultez leurs offres et postulez directement.
          </p>
        </div>

        {agencies.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-slate-100">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-900 mb-2">Aucune agence trouvée</h3>
            <p className="text-slate-500">Revenez bientôt pour découvrir nos partenaires.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agencies.map((agency) => (
              <Card key={agency.id} className="hover:shadow-md transition-shadow overflow-hidden border-slate-200">
                <div 
                  className="h-2 bg-indigo-600" 
                  style={{ backgroundColor: agency.primaryColor || '#4F46E5' }}
                />
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {agency.logoUrl ? (
                        <img src={agency.logoUrl} alt={agency.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                      {agency._count.jobs} offre{agency._count.jobs !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <CardTitle className="mt-4 text-xl">{agency.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>France entière</span> {/* Placeholder location */}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Link href={`/jobs?agencyId=${agency.id}`} className="w-full">
                    <Button variant="outline" className="w-full">
                      Voir les offres
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
