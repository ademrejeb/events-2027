import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Layout from "@/components/Layout";

const PlatformCharts = dynamic(() => import("@/components/PlatformCharts"), {
  ssr: false,
});

type PlatformData = {
  platform: { total_events: number; total_volunteers: number; total_organizations: number; total_profiles: number } | null;
  categories: { name: string; event_count: number }[];
  cities: { city: string; event_count: number }[];
  volunteer_growth: { date: string; count: number }[];
};



export default function StatsPage() {
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats/platform")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok || body.error) throw new Error(body.error ?? "stats");
        return body as PlatformData;
      })
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <section className="border-b border-zinc-200 bg-gradient-to-b from-red-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
            Statistiques de la plateforme
          </h1>
          <p className="mt-2 text-zinc-500">
            L&rsquo;impact de la communauté Yed Lkhir en Tunisie.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
            ))}
          </div>
        ) : !data ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500">
            Statistiques indisponibles pour le moment.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Actions" value={data?.platform?.total_events ?? 0} accent="from-red-600 to-orange-500" icon="M4 6h16M4 12h16M4 18h10" />
              <StatCard label="Bénévoles" value={data?.platform?.total_volunteers ?? 0} accent="from-orange-500 to-amber-500" icon="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8a8 8 0 0 1 16 0" />
              <StatCard label="Organisations" value={data?.platform?.total_organizations ?? 0} accent="from-rose-500 to-red-500" icon="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
              <StatCard label="Utilisateurs" value={data?.platform?.total_profiles ?? 0} accent="from-zinc-700 to-zinc-500" icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </div>

            <PlatformCharts
              categories={data.categories}
              cities={data.cities}
              growth={data.volunteer_growth}
            />
          </>
        )}
      </div>
    </Layout>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent}`}>
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={icon} />
        </svg>
      </div>
      <p className="text-3xl font-extrabold tabular-nums text-zinc-900">
        {value.toLocaleString("fr-TN")}
      </p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}
