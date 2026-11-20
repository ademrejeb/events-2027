import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Number(req.query.radius) || 25;
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  const supabase = createClient(req, res);

  const { data, error } = await supabase.rpc("nearby_events", {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radius,
    p_limit: limit,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ results: data ?? [] });
}
