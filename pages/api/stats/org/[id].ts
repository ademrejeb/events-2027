import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext, isAccountActive, isAdmin, isOrgMember } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation";

/** Organization dashboard stats — owner/member (or admin) only. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "Authentification requise." });
  if (!isAccountActive(ctx.profile)) {
    return res.status(403).json({ error: "Compte suspendu ou banni." });
  }

  const orgId = isUuid(req.query.id) ? req.query.id : null;
  if (!orgId) return res.status(400).json({ error: "Identifiant d'organisation invalide." });

  const allowed = isAdmin(ctx.profile) || (await isOrgMember(ctx.user.id, orgId));
  if (!allowed) {
    return res.status(403).json({ error: "Vous ne gérez pas cette organisation." });
  }

  const admin = adminClient();
  const { data: events } = await admin
    .from("events")
    .select("id, title, status, start_at, max_volunteers, city, image_url")
    .eq("org_id", orgId)
    .order("start_at", { ascending: false });

  const list = events ?? [];
  const eventIds = list.map((e) => e.id);

  const [volunteersRes, participantsRes] = await Promise.all([
    eventIds.length
      ? admin.from("volunteers").select("event_id").in("event_id", eventIds)
      : Promise.resolve({ data: [] as { event_id: string }[] }),
    eventIds.length
      ? admin
          .from("event_participants")
          .select("event_id")
          .in("event_id", eventIds)
      : Promise.resolve({ data: [] as { event_id: string }[] }),
  ]);

  const volunteersByEvent = new Map<string, number>();
  for (const v of volunteersRes.data ?? []) {
    volunteersByEvent.set(v.event_id, (volunteersByEvent.get(v.event_id) ?? 0) + 1);
  }

  // One registration = one person (the retired participants_count is ignored).
  const registrationsByEvent = new Map<string, number>();
  let totalRegistrations = 0;
  for (const p of participantsRes.data ?? []) {
    registrationsByEvent.set(p.event_id, (registrationsByEvent.get(p.event_id) ?? 0) + 1);
    totalRegistrations += 1;
  }

  const eventsWithCounts = list.map((e) => ({
    ...e,
    volunteer_count: volunteersByEvent.get(e.id) ?? 0,
    registration_count: registrationsByEvent.get(e.id) ?? 0,
  }));

  const now = Date.now();
  const upcomingEvents = eventsWithCounts
    .filter((e) => new Date(e.start_at).getTime() > now && e.status === "published")
    .slice(0, 5);

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({
    org_id: orgId,
    total_events: list.length,
    published_events: list.filter((e) => e.status === "published").length,
    completed_events: list.filter((e) => e.status === "completed").length,
    draft_events: list.filter((e) => e.status === "draft").length,
    total_volunteers: (volunteersRes.data ?? []).length,
    total_registrations: totalRegistrations,
    upcoming_events: upcomingEvents,
    events: eventsWithCounts,
  });
}
