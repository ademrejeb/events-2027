import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = createClient(req, res);

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio, role, created_at")
    .eq("id", id)
    .single();

  if (profileErr || !profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const [badgesRes, volRes, eventsRes] = await Promise.all([
    supabase
      .from("profile_badges")
      .select("badge_id, badges(name, slug, icon, description)")
      .eq("profile_id", id),
    supabase
      .from("volunteers")
      .select("event_id", { count: "exact", head: true })
      .eq("profile_id", id),
    supabase
      .from("volunteers")
      .select(
        "event_id, events(id, title, start_at, city, image_url, organizations(name, verified))",
      )
      .eq("profile_id", id)
      .order("joined_at", { foreignTable: "events", ascending: false })
      .limit(10),
  ]);

  return res.status(200).json({
    profile,
    badges: badgesRes.data ?? [],
    volunteer_count: volRes.count ?? 0,
    recent_events: eventsRes.data ?? [],
  });
}
