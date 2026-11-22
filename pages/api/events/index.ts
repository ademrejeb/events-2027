import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/supabase/api";
import { adminClient } from "@/lib/supabase/admin";
import { getEventCounts } from "@/lib/event-counts";
import { sanitizeUrlList, oneOf } from "@/lib/validation";
import { withApiLog } from "@/lib/api-log";

const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 100;

function parseLimit(value: unknown) {
  const n = parseInt(String(value ?? DEFAULT_LIMIT), 10);
  if (Number.isNaN(n)) return DEFAULT_LIMIT;
  return Math.min(Math.max(n, 1), MAX_LIMIT);
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    return listEvents(req, res);
  }
  if (req.method === "POST") {
    return createEvent(req, res);
  }
  return res.status(405).json({ error: "Method not allowed" });
}

async function listEvents(req: NextApiRequest, res: NextApiResponse) {
  const supabase = adminClient();

  const { category, city } = req.query;
  const limit = parseLimit(req.query.limit);
  const after = typeof req.query.after === "string" ? req.query.after : null;
  const upcomingOnly = req.query.upcoming === "1";

  let query = supabase
    .from("events")
    .select(
      "id, org_id, title, description, location, city, start_at, end_at, max_volunteers, status, image_url, lat, lng, created_at, organizations(name, type, verified), event_categories(name, slug)",
      { count: "exact" },
    )
    .eq("status", "published")
    .order("start_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (upcomingOnly) query = query.gte("start_at", new Date().toISOString());
  if (category) query = query.eq("category_id", String(category));
  if (city) query = query.ilike("city", `%${String(city)}%`);

  if (after) {
    const sep = after.indexOf("|");
    const cursorStartAt = decodeURIComponent(after.slice(0, sep));
    const cursorId = decodeURIComponent(after.slice(sep + 1));
    query = query.or(
      `and(start_at.eq.${cursorStartAt},id.gt.${cursorId}),start_at.gt.${cursorStartAt}`,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  let events = data ?? [];
  let nextCursor: string | null = null;

  if (events.length > limit) {
    events = events.slice(0, limit);
    const last = events[events.length - 1];
    nextCursor = `${encodeURIComponent(last.start_at)}|${encodeURIComponent(last.id)}`;
  }

  // Volunteer aggregates are computed server-side with the service role:
  // rosters and anonymous registrations are no longer publicly readable, so
  // an anon `count` embed would always return 0.
  const counts = await getEventCounts(events.map((e) => e.id));
  const eventsWithCounts = events.map((event) => {
    const c = counts[event.id] ?? { volunteers: 0, registrations: 0, total: 0 };
    return {
      ...event,
      volunteer_count: c.total,
      member_count: c.volunteers,
      registration_count: c.registrations,
    };
  });

  res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");

  return res.status(200).json({
    events: eventsWithCounts,
    next_cursor: nextCursor,
    total: count ?? events.length,
  });
}

async function createEvent(req: NextApiRequest, res: NextApiResponse) {
  const { supabase, user } = await getAuthUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const {
    org_id,
    title,
    description,
    category_id,
    location,
    city,
    start_at,
    end_at,
    max_volunteers,
    status,
    image_url,
    before_images,
    after_images,
    lat,
    lng,
    locations,
  } = req.body ?? {};

  const safeLocations = Array.isArray(locations)
    ? locations
        .filter(
          (l: unknown): l is { label?: string; lat: number; lng: number } =>
            !!l &&
            typeof l === "object" &&
            typeof (l as { lat: unknown }).lat === "number" &&
            typeof (l as { lng: unknown }).lng === "number",
        )
        .slice(0, 20)
    : [];

  if (
    typeof org_id !== "string" ||
    typeof title !== "string" ||
    typeof category_id !== "string" ||
    typeof start_at !== "string"
  ) {
    return res.status(400).json({
      error: "org_id, title, category_id and start_at are required",
    });
  }

  if (title.trim().length < 3 || title.trim().length > 120) {
    return res.status(400).json({
      error: "Le titre doit contenir entre 3 et 120 caractères",
    });
  }

  if (Number.isNaN(Date.parse(start_at))) {
    return res.status(400).json({ error: "Date de début invalide" });
  }

  if (
    end_at != null &&
    (typeof end_at !== "string" || Number.isNaN(Date.parse(end_at)))
  ) {
    return res.status(400).json({ error: "Date de fin invalide" });
  }

  if (
    max_volunteers != null &&
    (!Number.isInteger(max_volunteers) || max_volunteers < 1)
  ) {
    return res.status(400).json({
      error: "Le nombre de places doit être un entier positif",
    });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("org_id", org_id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!member && profile?.role !== "government") {
    return res.status(403).json({
      error: "Vous devez être membre de cette organisation",
    });
  }

  const payload: Record<string, unknown> = {
    org_id,
    title: title.trim(),
    description: description || null,
    category_id,
    location: location || null,
    city: city || null,
    start_at,
    end_at: end_at || null,
    max_volunteers: max_volunteers ?? null,
    status: oneOf(status, ["draft", "published"] as const) ?? "published",
    image_url: typeof image_url === "string" ? image_url : null,
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
  };
  // Only include optional columns when used, so the app keeps working even if
  // the corresponding migration has not been applied yet.
  if (safeLocations.length > 0) payload.locations = safeLocations;
  payload.before_images = sanitizeUrlList(before_images);
  payload.after_images = sanitizeUrlList(after_images);

  const { data, error } = await supabase
    .from("events")
    .insert(payload as never)
    .select("*")
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ event: data });
}

export default withApiLog(handler);
