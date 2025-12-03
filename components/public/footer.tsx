import Link from "next/link";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 py-12 bg-slate-50 text-slate-600 font-sans">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-xs font-bold text-white">Q</div>
            <span className="text-slate-900 font-bold">QuestHire</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500 font-medium">
            <Link href="/product" className="hover:text-indigo-600 transition-colors">Produit</Link>
            <Link href="/pricing" className="hover:text-indigo-600 transition-colors">Tarifs</Link>
            <Link href="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link>
            <Link href="/legal" className="hover:text-indigo-600 transition-colors">Mentions légales</Link>
          </div>
          <div className="text-sm text-slate-500">
            © {currentYear} QuestHire.
          </div>
        </div>
      </div>
    </footer>
  );
}
