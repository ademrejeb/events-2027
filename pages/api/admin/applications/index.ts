import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { oneOf, sanitizeText } from "@/lib/validation";

const STATUSES = ["pending", "approved", "rejected", "withdrawn", "suspended", "banned"] as const;

/** List organizer applications with optional status filter + search. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const status = oneOf(req.query.status, STATUSES);
  const q = sanitizeText(req.query.q, 80);

  const admin = adminClient();
  let query = admin
    .from("organizer_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,city.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ error: "Impossible de charger les candidatures." });
  }

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({ applications: data ?? [] });
}
