import { adminClient } from "./supabase/admin";

/**
 * Authoritative volunteer counts for events.
 *
 * Why the service role: after `admin-organizer-lifecycle.sql`, volunteer
 * rosters and account-free registrations are NOT publicly readable, so an anon
 * Supabase client returns 0 rows for `count`. These are aggregate numbers only
 * (no names, no contact data), computed server-side.
 *
 * One registration row = one person; the retired `participants_count` column is
 * intentionally ignored so counts stay truthful.
 */
export type EventCounts = {
  volunteers: number;
  registrations: number;
  total: number;
};

const CHUNK = 100;

function emptyCounts(): EventCounts {
  return { volunteers: 0, registrations: 0, total: 0 };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function getEventCounts(
  eventIds: string[],
): Promise<Record<string, EventCounts>> {
  const ids = Array.from(new Set(eventIds.filter((id) => typeof id === "string" && id)));
  const result: Record<string, EventCounts> = {};
  for (const id of ids) result[id] = emptyCounts();
  if (ids.length === 0) return result;

  const admin = adminClient();
  const chunks = chunk(ids, CHUNK);

  const [volunteerRows, registrationRows] = await Promise.all([
    Promise.all(
      chunks.map((group) =>
        admin.from("volunteers").select("event_id").in("event_id", group),
      ),
    ),
    Promise.all(
      chunks.map((group) =>
        admin.from("event_participants").select("event_id").in("event_id", group),
      ),
    ),
  ]);

  for (const response of volunteerRows) {
    if (response.error) continue;
    for (const row of response.data ?? []) {
      const counts = result[row.event_id];
      if (counts) counts.volunteers += 1;
    }
  }

  for (const response of registrationRows) {
    if (response.error) continue;
    for (const row of response.data ?? []) {
      const counts = result[row.event_id];
      if (counts) counts.registrations += 1;
    }
  }

  for (const counts of Object.values(result)) {
    counts.total = counts.volunteers + counts.registrations;
  }

  return result;
}
