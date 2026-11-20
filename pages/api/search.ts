import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@/lib/supabase/server";
import { getEventCounts } from "@/lib/event-counts";
import { withApiLog } from "@/lib/api-log";

/**
 * Legacy keyword search endpoint. The public UI now filters all actions
 * client-side (see components/ActionsExplorer.tsx); this endpoint remains for
 * API consumers and returns the same authoritative volunteer counts.
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 120) : "";
  if (q.length < 2) {
    return res.status(400).json({ error: "Recherche trop courte." });
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const supabase = createClient(req, res);

  // Strip characters that break Postgres tsquery parsing.
  const safeQuery = q.replace(/[&|!():*<>]/g, " ").replace(/\s+/g, " ").trim();

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, description, location, city, start_at, end_at, max_volunteers, image_url, status, organizations(name, type, verified), event_categories(name, slug)",
    )
    .eq("status", "published")
    .textSearch("search_vector", safeQuery, { type: "websearch" })
    .order("start_at", { ascending: true })
    .limit(limit);

  if (error) {
    return res.status(500).json({ error: "Recherche indisponible." });
  }

  const rows = data ?? [];
  const counts = await getEventCounts(rows.map((e) => e.id));
  const results = rows.map((event) => ({
    ...event,
    volunteer_count: counts[event.id]?.total ?? 0,
  }));

  return res.status(200).json({ results, query: q });
}

export default withApiLog(handler);
