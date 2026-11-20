import Link from "next/link";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { PageHeader } from "@adem.rejeb/ui";

const TABS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/applications", label: "Candidatures" },
  { href: "/admin/organizers", label: "Organisateurs" },
  { href: "/admin/feedback", label: "Signalements" },
  { href: "/admin/audit", label: "Journal d'audit" },
];

export default function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <PageHeader
        title={title}
        description={description}
        badge={
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-100">
            Administration
          </span>
        }
        actions={actions}
      />

      <nav
        aria-label="Sections d'administration"
        className="mt-8 flex flex-wrap gap-1.5 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-sm"
      >
        {TABS.map((tab) => {
          const active =
            tab.href === "/admin"
              ? router.pathname === "/admin"
              : router.pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={
                "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors " +
                (active
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900")
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  );
}
