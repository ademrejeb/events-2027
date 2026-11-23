import type { NextApiRequest, NextApiResponse } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { buildBadgeTracks, earnedBadgeCount } from "@/lib/badges";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid profile id" });
  }

  const admin = adminClient();

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, bio, role, created_at")
    .eq("id", id)
    .single();

  if (profileErr || !profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const [volRes, eventsRes] = await Promise.all([
    admin
      .from("volunteers")
      .select("event_id", { count: "exact", head: true })
      .eq("profile_id", id),
    admin
      .from("volunteers")
      .select(
        "event_id, events(id, title, start_at, city, image_url, organizations(name, verified))",
      )
      .eq("profile_id", id)
      .order("joined_at", { foreignTable: "events", ascending: false })
      .limit(10),
  ]);

  // Badge metrics are computed from the platform's own rows, never stored by
  // hand. Service role: the aggregates must not depend on RLS policies.
  const now = Date.now();
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
  const createdAt = new Date(profile.created_at).getTime();
  const tenureMonths = Number.isFinite(createdAt)
    ? Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24 * 30.4375)))
    : 0;

  const { data: ownedOrgs } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_id", id);
  const orgIds = (ownedOrgs ?? []).map((org) => org.id);

  let eventsCreated = 0;
  let recentEvents = 0;
  let volunteersReached = 0;

  if (orgIds.length > 0) {
    const { data: orgEvents } = await admin
      .from("events")
      .select("id, created_at")
      .in("org_id", orgIds);
    const events = orgEvents ?? [];
    eventsCreated = events.length;
    recentEvents = events.filter(
      (event) =>
        event.created_at &&
        new Date(event.created_at).getTime() >= ninetyDaysAgo.getTime(),
    ).length;
    if (events.length > 0) {
      const { count } = await admin
        .from("volunteers")
        .select("event_id", { count: "exact", head: true })
        .in(
          "event_id",
          events.map((event) => event.id),
        );
      volunteersReached = count ?? 0;
    }
  }

  const { count: recentJoined } = await admin
    .from("volunteers")
    .select("event_id", { count: "exact", head: true })
    .eq("profile_id", id)
    .gte("joined_at", ninetyDaysAgo.toISOString());

  const isOrganization = profile.role === "organization";
  const actionsJoined = volRes.count ?? 0;
  const badgeTracks = buildBadgeTracks(profile.role, {
    tenureMonths,
    eventsCreated,
    volunteersReached,
    actionsJoined,
    momentum: isOrganization ? recentEvents : recentJoined ?? 0,
  });

  return res.status(200).json({
    profile,
    badge_tracks: badgeTracks,
    badge_stats: {
      tenure_months: tenureMonths,
      events_created: eventsCreated,
      volunteers_reached: volunteersReached,
      actions_joined: actionsJoined,
    },
    badges_earned: earnedBadgeCount(badgeTracks),
    volunteer_count: actionsJoined,
    recent_events: eventsRes.data ?? [],
  });
}
