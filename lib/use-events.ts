import { useCallback, useEffect, useState } from "react";
import type { EventListItem } from "@/components/EventCard";

type EventsResponse = {
  events: EventListItem[];
  next_cursor: string | null;
  total: number;
};

/**
 * Loads every published action once, client-side, by following the API cursor.
 * The public search then filters this in-memory list instantly (no round-trip
 * per keystroke). Capped to keep payloads bounded; Tunisia's volume is small.
 */
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

export function useAllEvents() {
  const [events, setEvents] = useState<EventListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        let cursor: string | null = null;
        const collected: EventListItem[] = [];
        const seen = new Set<string>();
        let reportedTotal = 0;

        for (let page = 0; page < MAX_PAGES; page += 1) {
          const params = new URLSearchParams({ limit: String(PAGE_SIZE), upcoming: "1" });
          if (cursor) params.set("after", cursor);

          const res = await fetch(`/api/events?${params}`, { cache: "no-store" });
          const data = (await res.json()) as EventsResponse & { error?: string };
          if (!res.ok || data.error) {
            throw new Error(data.error ?? "Impossible de charger les actions.");
          }
          if (cancelled) return;

          for (const event of data.events ?? []) {
            if (seen.has(event.id)) continue;
            seen.add(event.id);
            collected.push(event);
          }
          // A cursor page can report a smaller count than the first page; the
          // first response carries the authoritative total.
          if (page === 0) reportedTotal = data.total ?? collected.length;
          cursor = data.next_cursor ?? null;
          if (!cursor) break;
        }

        if (cancelled) return;
        setEvents(collected);
        setTotal(reportedTotal);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            (err as Error).message || "Impossible de charger les actions.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return {
    events,
    total,
    loading: events === null && !error,
    error,
    reload,
  };
}
