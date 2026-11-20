import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session";
import { Logo } from "./Logo";
import NotificationBell from "./NotificationBell";
import { Button, Container, Flex } from "@adem.rejeb/ui";

const NAV_LINKS = [
  { href: "/#evenements", label: "Actions" },
  { href: "/organizations", label: "Organisateurs" },
  { href: "/a-propos", label: "À propos" },
  { href: "/stats", label: "Statistiques" },
];

export default function Nav() {
  const { user, profile, account, loading, refresh } = useSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [router.asPath]);

  useEffect(() => {
    if (!menuOpen && !accountOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setAccountOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [menuOpen, accountOpen]);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await refresh();
      setMenuOpen(false);
      setAccountOpen(false);
      router.push("/");
    } finally {
      setSigningOut(false);
    }
  }

  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const initial = (firstName ?? user?.email ?? "?").charAt(0).toUpperCase();
  const isOrganizer = account?.organizer_status === "approved";
  const navLink =
    "rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-700";
  const accountItem =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900";

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 shadow-sm backdrop-blur-md">
      <Container>
        <Flex align="center" justify="between" style={{ height: 72 }}>
          <Flex align="center" gap={6}>
            <Logo />
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
              {NAV_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className={navLink}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </Flex>

          <Flex align="center" gap={2}>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 lg:hidden"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>

            {loading ? (
              <div className="h-9 w-28 animate-pulse rounded-full bg-zinc-100" />
            ) : user ? (
              <>
                {isOrganizer ? (
                  <Link href="/events/new" className="hidden md:block">
                    <Button variant="primary" size="sm">
                      + Créer une action
                    </Button>
                  </Link>
                ) : null}

                <NotificationBell userId={user.id} />

                <div className="relative" ref={accountRef}>
                  <button
                    type="button"
                    className="flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-2 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                    aria-label="Mon compte"
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                    aria-controls="account-menu"
                    onClick={() => setAccountOpen((v) => !v)}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-xs font-bold text-white">
                      {initial}
                    </span>
                    <span className="hidden max-w-[7rem] truncate text-sm font-semibold text-zinc-700 md:block">
                      {firstName ?? "Mon compte"}
                    </span>
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 fill-none stroke-zinc-500"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 8l4 4 4-4" />
                    </svg>
                  </button>

                  {accountOpen ? (
                    <div
                      id="account-menu"
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg"
                    >
                      <div className="border-b border-zinc-100 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {profile?.full_name ?? firstName ?? "Mon compte"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">{user.email}</p>
                      </div>
                      <div className="p-1.5">
                        {account?.is_admin ? (
                          <Link href="/admin" role="menuitem" className={accountItem} onClick={() => setAccountOpen(false)}>
                            Administration
                          </Link>
                        ) : null}
                        {isOrganizer ? (
                          <Link href="/organizations/mine" role="menuitem" className={accountItem} onClick={() => setAccountOpen(false)}>
                            Mon espace
                          </Link>
                        ) : null}
                        <Link href={`/profiles/${user.id}`} role="menuitem" className={accountItem} onClick={() => setAccountOpen(false)}>
                          Mon profil
                        </Link>
                        <Link href="/settings" role="menuitem" className={accountItem} onClick={() => setAccountOpen(false)}>
                          Paramètres
                        </Link>
                      </div>
                      <div className="border-t border-zinc-100 p-1.5">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          disabled={signingOut}
                          className={accountItem + " text-red-700 hover:bg-red-50 hover:text-red-800"}
                        >
                          {signingOut ? "Déconnexion…" : "Déconnexion"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    Se connecter
                  </Button>
                </Link>
                <Link href="/signup" className="hidden sm:block">
                  <Button variant="primary" size="sm">
                    Devenir organisateur
                  </Button>
                </Link>
              </>
            )}
          </Flex>
        </Flex>
      </Container>

      {menuOpen ? (
        <div id="mobile-nav" className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-zinc-200 bg-white lg:hidden">
          <Container>
            <nav className="flex flex-col gap-1 py-3" aria-label="Navigation mobile">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLink}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              <div className="my-2 h-px bg-zinc-100" />

              {!loading && user ? (
                <>
                  {account?.is_admin ? (
                    <Link href="/admin" className={navLink} onClick={() => setMenuOpen(false)}>
                      Administration
                    </Link>
                  ) : isOrganizer ? (
                    <Link
                      href="/organizations/mine"
                      className={navLink}
                      onClick={() => setMenuOpen(false)}
                    >
                      Mon espace
                    </Link>
                  ) : null}
                  {isOrganizer ? (
                    <Link href="/events/new" className={navLink} onClick={() => setMenuOpen(false)}>
                      Créer une action
                    </Link>
                  ) : null}
                  <Link
                    href={`/profiles/${user.id}`}
                    className={navLink}
                    onClick={() => setMenuOpen(false)}
                  >
                    Mon profil
                  </Link>
                  <Link
                    href="/settings"
                    className={navLink}
                    onClick={() => setMenuOpen(false)}
                  >
                    Paramètres
                  </Link>
                  <button
                    type="button"
                    className={navLink + " text-left text-red-700 hover:bg-red-50 hover:text-red-800"}
                    onClick={handleLogout}
                    disabled={signingOut}
                  >
                    {signingOut ? "Déconnexion…" : "Déconnexion"}
                  </button>
                </>
              ) : !loading ? (
                <>
                  <Link href="/login" className={navLink} onClick={() => setMenuOpen(false)}>
                    Se connecter
                  </Link>
                  <Link href="/signup" className={navLink} onClick={() => setMenuOpen(false)}>
                    Devenir organisateur
                  </Link>
                </>
              ) : null}
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
