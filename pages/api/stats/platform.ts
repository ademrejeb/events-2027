import type { NextApiRequest, NextApiResponse } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/logger";
import { withApiLog } from "@/lib/api-log";

type CategoryRow = { id: string; name: string; slug: string };
type EventRow = { id: string; city: string | null; category_id: string | null };
type VolunteerRow = { profile_id: string; joined_at: string };

function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = adminClient();
  const [eventsRes, volunteersRes, organizationsRes, profilesRes, categoriesRes] =
    await Promise.all([
      admin.from("events").select("id, city, category_id").eq("status", "published"),
      admin.from("volunteers").select("profile_id, joined_at"),
      admin.from("organizations").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("event_categories").select("id, name, slug"),
    ]);

  const failure =
    eventsRes.error ??
    volunteersRes.error ??
    organizationsRes.error ??
    profilesRes.error ??
    categoriesRes.error;
  if (failure) {
    logEvent("error", "stats.failed", { reason: failure.message });
    return res.status(500).json({ error: "Statistiques indisponibles pour le moment." });
  }

  const events = (eventsRes.data ?? []) as EventRow[];
  const volunteers = (volunteersRes.data ?? []) as VolunteerRow[];
  const categories = (categoriesRes.data ?? []) as CategoryRow[];

  const categoryCount = new Map<string, number>();
  const cityCount = new Map<string, number>();
  for (const event of events) {
    if (event.category_id) {
      categoryCount.set(event.category_id, (categoryCount.get(event.category_id) ?? 0) + 1);
    }
    if (event.city) cityCount.set(event.city, (cityCount.get(event.city) ?? 0) + 1);
  }

  const monthly = new Map<string, Set<string>>();
  for (const volunteer of volunteers) {
    const key = monthKey(volunteer.joined_at);
    if (!key) continue;
    const set = monthly.get(key) ?? new Set<string>();
    set.add(volunteer.profile_id);
    monthly.set(key, set);
  }

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json({    platform: {
      total_events: events.length,
      total_volunteers: new Set(volunteers.map((v) => v.profile_id)).size,
      total_organizations: organizationsRes.count ?? 0,
      total_profiles: profilesRes.count ?? 0,
      total_cities: cityCount.size,
    },
    categories: categories
      .map((category) => ({
        name: category.name,
        event_count: categoryCount.get(category.id) ?? 0,
      }))
      .filter((category) => category.event_count > 0)
      .sort((a, b) => b.event_count - a.event_count),
    cities: Array.from(cityCount, ([city, event_count]) => ({ city, event_count }))
      .sort((a, b) => b.event_count - a.event_count)
      .slice(0, 10),
    volunteer_growth: Array.from(monthly, ([date, profiles]) => ({
      date,
      count: profiles.size,
    })).sort((a, b) => a.date.localeCompare(b.date)),
  });
}

export default withApiLog(handler);
