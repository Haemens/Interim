import Link from "next/link";

interface PublicFooterProps {
  agencyName: string;
}

export function PublicFooter({ agencyName }: PublicFooterProps) {
  return (
    <footer className="py-8 px-4 bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            <span className="font-bold text-slate-900">{agencyName}</span>
            <span className="mx-2 text-slate-300">|</span>
            <a href="mailto:contact@example.com" className="text-slate-500 hover:text-indigo-600 transition-colors">
              Nous contacter
            </a>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="#" className="hover:text-slate-900">Mentions légales</Link>
            <Link href="#" className="hover:text-slate-900">Confidentialité</Link>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
          Propulsé par{" "}
          <a
            href="https://questhire.com"
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
            target="_blank"
            rel="noopener noreferrer"
          >
            QuestHire
          </a>
        </div>
      </div>
    </footer>
  );
}
