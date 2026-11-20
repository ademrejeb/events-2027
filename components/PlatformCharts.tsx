import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#dc2626", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899"];

type CategoryDatum = { name: string; event_count: number };
type CityDatum = { city: string; event_count: number };
type GrowthDatum = { date: string; count: number };

function monthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-bold text-zinc-900">{title}</h2>
        {hint && <span className="text-xs text-zinc-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-zinc-200 text-sm text-zinc-500">
      {label}
    </div>
  );
}

export default function PlatformCharts({
  categories,
  cities,
  growth,
}: {
  categories: CategoryDatum[];
  cities: CityDatum[];
  growth: GrowthDatum[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Actions par catégorie" hint={`${categories.length} catégories`}>
          {categories.length === 0 ? (
            <EmptyChart label="Aucune action publiée pour le moment." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="event_count"
                  nameKey="name"
                >
                  {categories.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Actions par ville" hint="Top 10">
          {cities.length === 0 ? (
            <EmptyChart label="Aucune ville renseignée." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cities} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="city" tick={{ fontSize: 12, fill: "#71717a" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#71717a" }} />
                <Tooltip cursor={{ fill: "rgba(220,38,38,0.06)" }} />
                <Bar dataKey="event_count" name="Actions" fill="#dc2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Évolution des inscriptions bénévoles" hint="Par mois">
        {growth.length === 0 ? (
          <EmptyChart label="Aucune inscription bénévole enregistrée." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={growth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis
                dataKey="date"
                tickFormatter={monthLabel}
                tick={{ fontSize: 12, fill: "#71717a" }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#71717a" }} />
              <Tooltip
                labelFormatter={(value) => monthLabel(String(value))}
                formatter={(value) => [String(value), "Bénévoles"]}
              />
              <Bar dataKey="count" name="Bénévoles" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
