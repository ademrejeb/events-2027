import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { oneOf, sanitizeText } from "@/lib/validation";

const STATUSES = ["none", "pending", "approved", "rejected", "suspended", "banned"] as const;

/** List organizer accounts (with their organization) for management. */
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
    .from("profiles")
    .select(
      "id, full_name, phone, role, account_status, organizer_status, is_admin, created_at, organizations!organizations_owner_id_fkey(id, name, type, city, verified, status)",
    )
    .in("role", ["organization", "government"])
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("organizer_status", status);
  if (q) query = query.ilike("full_name", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ error: "Impossible de charger les organisateurs." });
  }

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({ organizers: data ?? [] });
}
