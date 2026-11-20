import Link from "next/link";
import { Logo } from "./Logo";

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

function SocialIcon({
  label,
  path,
  href,
}: {
  label: string;
  path: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white hover:text-red-700"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d={path} />
      </svg>
    </a>
  );
}

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
            <div className="mt-5 flex gap-2">
              <SocialIcon
                label="Facebook"
                href="https://www.facebook.com"
                path="M13.5 21v-7h2.3l.4-2.8h-2.7V9.4c0-.8.2-1.4 1.4-1.4h1.5V5.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v2.8h2.5V21z"
              />
              <SocialIcon
                label="Instagram"
                href="https://www.instagram.com"
                path="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.1A6.7 6.7 0 1 0 18.7 12 6.7 6.7 0 0 0 12 5.3zm0 11A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3zm6.9-11.3a1.6 1.6 0 1 1-1.6-1.6 1.6 1.6 0 0 1 1.6 1.6z"
              />
              <SocialIcon
                label="X"
                href="https://x.com"
                path="M17.5 3h3l-7 8 8.2 10h-6.4l-5-6.1L4.5 21h-3l7.5-8.6L1.2 3h6.6l4.5 5.5zm-1 16h1.7L7.5 4.7H5.7z"
              />
            </div>
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
