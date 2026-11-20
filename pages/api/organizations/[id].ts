import type { NextApiRequest, NextApiResponse } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { getEventCounts } from "@/lib/event-counts";
import { isUuid, queryId } from "@/lib/validation";
import { withApiLog } from "@/lib/api-log";

const ORG_COLUMNS =
  "id, name, type, description, city, logo_url, verified, website, public_email, public_phone, rib_holder, bank_name, rib, donation_instructions, donation_url";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = queryId(req.query.id);
  if (!isUuid(id)) {
    return res.status(400).json({ error: "Identifiant d'organisation invalide." });
  }

  const admin = adminClient();

  const [orgResult, eventsResult] = await Promise.all([
    admin
      .from("organizations")
      .select(ORG_COLUMNS)
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle(),
    admin
      .from("events")
      .select(
        "*, organizations(name, type, verified), event_categories(name, slug)",
      )
      .eq("org_id", id)
      .eq("status", "published")
      .order("start_at", { ascending: true }),
  ]);

  if (orgResult.error || eventsResult.error) {
    return res
      .status(500)
      .json({ error: "Impossible de charger cette organisation." });
  }

  if (!orgResult.data) {
    return res.status(404).json({ error: "Organisation introuvable." });
  }

  const events = eventsResult.data ?? [];
  const counts = await getEventCounts(events.map((event) => event.id));
  const eventsWithCounts = events.map((event) => {
    const c = counts[event.id] ?? { volunteers: 0, registrations: 0, total: 0 };
    return {
      ...event,
      volunteer_count: c.total,
      member_count: c.volunteers,
      registration_count: c.registrations,
    };
  });

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json({
    organization: orgResult.data,
    events: eventsWithCounts,
  });
}

export default withApiLog(handler);
