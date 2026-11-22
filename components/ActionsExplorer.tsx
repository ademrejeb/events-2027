import { useMemo, useState } from "react";
import EventCard, { type EventListItem } from "./EventCard";

type DateFilter = "upcoming" | "7" | "30" | "all";
type SortMode = "date" | "volunteers";

const INITIAL_VISIBLE = 60;
const VISIBLE_STEP = 60;

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "upcoming", label: "À venir" },
  { id: "7", label: "7 jours" },
  { id: "30", label: "30 jours" },
  { id: "all", label: "Toutes" },
];

const renderClock = () => Date.now();

export default function ActionsExplorer({
  events,
  loading,
  error,
  onRetry,
  initialQuery,
}: {
  events: EventListItem[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("upcoming");
  const [sort, setSort] = useState<SortMode>("date");
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const onQueryChange = setQuery;

  // Back to the first page of cards whenever the filters or the loaded data
  // change. Compared during render so the list is never painted with a stale
  // window (an effect would paint first, then re-render).
  const filterKey = `${query}|${category ?? ""}|${dateFilter}|${sort}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  const [lastEvents, setLastEvents] = useState(events);
  if (lastFilterKey !== filterKey || lastEvents !== events) {
    setLastFilterKey(filterKey);
    setLastEvents(events);
    setVisible(INITIAL_VISIBLE);
  }

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    (events ?? []).forEach((event) =>
      seen.set(event.event_categories.slug, event.event_categories.name),
    );
    return Array.from(seen, ([slug, name]) => ({ slug, name }));
  }, [events]);

  const filtered = useMemo(() => {
    const now = renderClock();
    const maxDays = dateFilter === "7" ? 7 : dateFilter === "30" ? 30 : null;
    const q = normalize(query);

    const rows = (events ?? []).filter((event) => {
      if (category && event.event_categories.slug !== category) return false;

      const start = new Date(event.start_at).getTime();
      if (dateFilter !== "all") {
        if (!Number.isFinite(start) || start < now) return false;
        if (maxDays !== null && start > now + maxDays * 86_400_000) return false;
      }

      if (!q) return true;
      const haystack = normalize(
        [
          event.title,
          event.description,
          event.city,
          event.location,
          event.organizations?.name,
          event.event_categories?.name,
        ]
          .filter(Boolean)
          .join(" "),
      );
      return haystack.includes(q);
    });

    return rows.sort((a, b) =>
      sort === "volunteers"
        ? (b.volunteer_count ?? 0) - (a.volunteer_count ?? 0)
        : new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
  }, [events, category, dateFilter, query, sort]);

  const hasFilters =
    !!query.trim() || category !== null || dateFilter !== "upcoming";

  function reset() {
    onQueryChange("");
    setCategory(null);
    setDateFilter("upcoming");
    setSort("date");
  }

  return (
    <div>
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Rechercher une action, une ville, une organisation…"
            aria-label="Rechercher dans les actions"
            className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-10 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Catégorie
          </span>
          <button
            type="button"
            onClick={() => setCategory(null)}
            aria-pressed={category === null}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
              (category === null
                ? "border-red-600 bg-red-600 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-red-200 hover:text-red-700")
            }
          >
            Toutes
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCategory(category === c.slug ? null : c.slug)}
              aria-pressed={category === c.slug}
              className={
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                (category === c.slug
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-red-200 hover:text-red-700")
              }
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Dates
            </span>
            {DATE_FILTERS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDateFilter(d.id)}
                aria-pressed={dateFilter === d.id}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                  (dateFilter === d.id
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200")
                }
              >
                {d.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-500">
            Trier par
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 outline-none focus:border-red-500"
            >
              <option value="date">Date</option>
              <option value="volunteers">Bénévoles</option>
            </select>
          </label>
        </div>
      </div>

      <p className="mt-5 text-sm text-zinc-500" role="status" aria-live="polite">
        {loading
          ? "Chargement des actions…"
          : `${filtered.length} action${filtered.length !== 1 ? "s" : ""}${
              query.trim() ? ` pour « ${query.trim()} »` : ""
            }`}
      </p>

      {error && !loading ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="h-44 animate-pulse bg-zinc-100" />
              <div className="space-y-3 p-4">
                <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 p-12 text-center">
          <p className="font-semibold text-zinc-900">Aucune action trouvée</p>
          <p className="mt-1 text-sm text-zinc-500">
            Essayez un autre mot-clé, une autre catégorie ou une autre période.
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-red-200 hover:text-red-700"
            >
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, visible).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {filtered.length > visible ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((value) => value + VISIBLE_STEP)}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-red-300 hover:text-red-700"
              >
                Afficher plus d’actions ({filtered.length - visible})
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
