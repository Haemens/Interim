import Link from "next/link";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-900 py-12 bg-slate-950 text-slate-400 font-sans">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-xs font-bold text-white">I</div>
            <span className="text-slate-300 font-semibold">Interim</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500">
            <Link href="/product" className="hover:text-white transition-colors">Produit</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Tarifs</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/legal" className="hover:text-white transition-colors">Mentions légales</Link>
          </div>
          <div className="text-sm text-slate-600">
            © {currentYear} Interim by QuestHire.
          </div>
        </div>
      </div>
    </footer>
  );
}
