import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import SocialPublisher from "@/components/SocialPublisher";
import EventRegistrations from "@/components/EventRegistrations";
import OrganizerEventList from "@/components/OrganizerEventList";
import { useSession } from "@/lib/session";
import { formatEventDate } from "@/lib/format";
import { Button } from "@adem.rejeb/ui";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

type OrgStats = {
  org_id: string; total_events: number; published_events: number; completed_events: number;
  draft_events?: number; total_volunteers: number; total_registrations?: number;
  upcoming_events: { id: string; title: string; start_at: string; city: string | null; image_url: string | null; max_volunteers: number | null }[];
  events: { id: string; title: string; status: string; start_at: string; city: string | null; image_url: string | null; max_volunteers: number | null; volunteer_count?: number; registration_count?: number }[];
};

export default function OrgDashboard() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: sessionLoading } = useSession();
  const [data, setData] = useState<OrgStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    let active = true;
    fetch(`/api/stats/org/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => { if (active) setData(d); })
      .catch(() => { if (active) setError("Impossible de charger les statistiques"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, user, reloadKey]);

  if (loading || sessionLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="h-64 animate-pulse rounded-3xl bg-zinc-100" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <p className="text-zinc-500">{error ?? "Tableau de bord introuvable"}</p>
          <Link href="/" className="mt-4 inline-block text-red-600 hover:underline">
            Retour
          </Link>
        </div>
      </Layout>
    );
  }

  const eventChartData = data.events.map((e) => ({
    name: e.title.length > 20 ? e.title.slice(0, 20) + "…" : e.title,
    bénévoles: (e.volunteer_count ?? 0) + (e.registration_count ?? 0),
  }));

  return (
    <Layout>
      <section className="border-b border-zinc-200 bg-gradient-to-b from-red-50 to-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-12">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
              Tableau de bord
            </h1>
            <p className="mt-2 text-zinc-500">
              Suivez l&rsquo;impact et les bénévoles de votre organisation.
            </p>
          </div>
          <Link href="/events/new">
            <Button variant="primary">+ Créer une action</Button>
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Actions totales" value={data.total_events} accent="from-red-600 to-orange-500" />
          <StatCard label="Publiées" value={data.published_events} accent="from-orange-500 to-amber-500" />
          <StatCard label="Terminées" value={data.completed_events} accent="from-rose-500 to-red-500" />
          <StatCard label="Inscriptions" value={data.total_registrations ?? 0} accent="from-emerald-500 to-green-600" />
          <StatCard label="Membres communauté" value={data.total_volunteers} accent="from-zinc-700 to-zinc-500" />
        </div>

        {typeof id === "string" && <SocialPublisher orgId={id} />}

        {eventChartData.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900">Bénévoles par action</h2>
            <ResponsiveContainer width="100%" height={Math.max(250, eventChartData.length * 44)}>
              <BarChart data={eventChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="bénévoles" fill="#dc2626" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.upcoming_events.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Prochaines actions</h2>
            <div className="space-y-3">
              {data.upcoming_events.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 transition-all hover:border-red-200 hover:shadow-md"
                >
                  <Link href={`/events/${evt.id}`} className="group flex min-w-0 flex-1 items-center gap-4">
                    {evt.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={evt.image_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-lg font-bold text-white">
                        {evt.title.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900 group-hover:text-red-700">
                        {evt.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatEventDate(evt.start_at)}
                        {evt.city && ` · ${evt.city}`}
                      </p>
                    </div>
                  </Link>
                  <EventRegistrations eventId={evt.id} />
                </div>
              ))}
            </div>
          </section>
        )}
        <OrganizerEventList
          events={(data.events ?? []).map((e) => ({
            id: e.id,
            title: e.title,
            status: e.status,
            start_at: e.start_at,
            city: e.city,
            image_url: e.image_url,
            max_volunteers: e.max_volunteers,
            volunteer_count: e.volunteer_count,
            registration_count: e.registration_count,
          }))}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      </div>
    </Layout>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 h-1.5 w-12 rounded-full bg-gradient-to-r ${accent}`} />
      <p className="text-3xl font-extrabold tabular-nums text-zinc-900">
        {value.toLocaleString("fr-TN")}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}
