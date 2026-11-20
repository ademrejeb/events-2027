import { useEffect, useState } from "react";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { requireAdminPage } from "@/lib/page-auth";
import type { ProfileRow } from "@/lib/authz";
import AdminShell from "@/components/AdminShell";
import { Alert, Badge, Button, Skeleton } from "@adem.rejeb/ui";

type Overview = {
  kpis: {
    pending_applications: number;
    approved_organizations: number;
    rejected_applications: number;
    restricted_accounts: number;
    published_events: number;
    draft_events: number;
    volunteer_registrations: number;
    total_accounts: number;
  };
  recent_applications: {
    id: string;
    name: string;
    kind: string;
    email: string;
    city: string | null;
    status: string;
    created_at: string;
  }[];
  recent_audit: {
    id: string;
    actor_email: string | null;
    action: string;
    target_type: string | null;
    target_id: string | null;
    created_at: string;
  }[];
};

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  approved: "Approuvée",
  rejected: "Refusée",
  pending: "En attente",
  withdrawn: "Retirée",
  suspended: "Suspendue",
  banned: "Bannie",
};

export const getServerSideProps: GetServerSideProps<{
  profile: ProfileRow;
}> = async (ctx) => requireAdminPage(ctx);

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <AdminShell
      title="Vue d'ensemble"
      description="Gouvernance de la plateforme : candidatures, comptes et activité."
    >
      {error && <Alert variant="danger">{error}</Alert>}

      {!data && !error ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={132} />
          ))}
        </div>
      ) : null}

      {data && (
        <div className="space-y-10">
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-display text-xl font-bold text-zinc-900">
                Indicateurs clés
              </h2>
              <p className="text-xs text-zinc-400">
                Vue consolidée de la plateforme
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                label="Candidatures en attente"
                value={data.kpis.pending_applications}
                tone="amber"
              />
              <Kpi
                label="Organisations approuvées"
                value={data.kpis.approved_organizations}
                tone="emerald"
              />
              <Kpi
                label="Comptes restreints"
                value={data.kpis.restricted_accounts}
                tone="rose"
              />
              <Kpi
                label="Inscriptions bénévoles"
                value={data.kpis.volunteer_registrations}
                tone="sky"
              />
              <Kpi
                label="Actions publiées"
                value={data.kpis.published_events}
                tone="red"
              />
              <Kpi
                label="Brouillons"
                value={data.kpis.draft_events}
                tone="zinc"
              />
              <Kpi
                label="Candidatures refusées"
                value={data.kpis.rejected_applications}
                tone="orange"
              />
              <Kpi
                label="Comptes totaux"
                value={data.kpis.total_accounts}
                tone="violet"
              />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Panel
              title="Dernières candidatures"
              description="Demandes d'organisateurs récemment reçues."
              action={
                <Link href="/admin/applications">
                  <Button variant="outline" size="sm">
                    Tout voir
                  </Button>
                </Link>
              }
            >
              {data.recent_applications.length === 0 ? (
                <PanelEmpty
                  title="Aucune candidature"
                  description="Les nouvelles demandes apparaîtront ici."
                />
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {data.recent_applications.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-800">
                          {a.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {a.email}
                          {a.city ? ` · ${a.city}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant={
                          a.status === "approved"
                            ? "success"
                            : a.status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {APPLICATION_STATUS_LABELS[a.status] ?? a.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Activité administrative récente"
              description="Dernières actions journalisées."
              action={
                <Link href="/admin/audit">
                  <Button variant="outline" size="sm">
                    Ouvrir le journal
                  </Button>
                </Link>
              }
            >
              {data.recent_audit.length === 0 ? (
                <PanelEmpty
                  title="Aucune activité"
                  description="Les actions administratives seront tracées ici."
                />
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {data.recent_audit.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-800">
                          {entry.action}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {entry.actor_email ?? "système"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {new Date(entry.created_at).toLocaleString("fr-FR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>
        </div>
      )}
    </AdminShell>
  );
}

const TONES: Record<string, string> = {
  amber: "from-amber-400 to-orange-500",
  emerald: "from-emerald-400 to-teal-500",
  rose: "from-rose-400 to-red-500",
  sky: "from-sky-400 to-blue-500",
  red: "from-red-500 to-orange-500",
  zinc: "from-zinc-400 to-zinc-600",
  orange: "from-orange-400 to-amber-500",
  violet: "from-violet-400 to-purple-500",
};

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONES | string;
}) {
  return (
    <div className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <span
          className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${
            TONES[tone] ?? TONES.zinc
          }`}
        />
      </div>
      <p className="mt-4 font-display text-4xl font-bold tabular-nums tracking-tight text-zinc-900">
        {value.toLocaleString("fr-FR")}
      </p>
    </div>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-zinc-900">{title}</h2>
          {description && (
            <p className="mt-1 text-xs text-zinc-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-zinc-700">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
    </div>
  );
}
