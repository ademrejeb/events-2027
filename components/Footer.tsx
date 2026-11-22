import Link from "next/link";
import { Logo } from "./Logo";
import FooterSocial from "./FooterSocial";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Découvrir",
    links: [
      { label: "Toutes les actions", href: "/#evenements" },
      { label: "Organisateurs", href: "/organizations" },
      { label: "Rechercher une action", href: "/#evenements" },
      { label: "Statistiques", href: "/stats" },
    ],
  },
  {
    title: "Organisateurs",
    links: [
      { label: "Devenir organisateur", href: "/signup" },
      { label: "Se connecter", href: "/login" },
      { label: "Mon espace", href: "/organizations/mine" },
    ],
  },
  {
    title: "Communauté",
    links: [
      { label: "Devenir bénévole", href: "/#evenements" },
      { label: "À propos", href: "/a-propos" },
      { label: "Politique de confidentialité", href: "/privacy" },
      { label: "Nous contacter", href: "/a-propos#contact" },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-zinc-900 text-zinc-300">
      {/* CTA band */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-7 sm:px-6 sm:py-8 lg:flex-row">
          <div className="text-center lg:text-left">
            <p className="text-lg font-bold text-white">
              Prêt à tendre la main du bien ?
            </p>
            <p className="text-sm text-white/85">
              Rejoignez des milliers de bénévoles et d&rsquo;organisations en Tunisie.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/#evenements"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
            >
              Trouver une action
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-white/60 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Devenir organisateur
            </Link>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo tone="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-400">
              Yed Lkhir — يد الخير. La plateforme tunisienne qui relie les
              bénévoles aux organisations pour un impact solidaire réel.
            </p>
            <FooterSocial />
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-sm font-semibold text-white">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-zinc-400 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-zinc-500 sm:flex-row sm:px-6">
          <span suppressHydrationWarning>
            © {year} Yed Lkhir — يد الخير. Tous droits réservés.
          </span>
          <span>Fait avec le cœur pour la Tunisie</span>
        </div>
      </div>
    </footer>
  );
}
