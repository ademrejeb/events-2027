import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { clampInt, sanitizeText } from "@/lib/validation";

/** Read the append-only admin audit trail (read-only). */
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

  const limit = clampInt(req.query.limit ?? 50, 1, 200) ?? 50;
  const offset = clampInt(req.query.offset ?? 0, 0, 100000) ?? 0;
  const q = sanitizeText(req.query.q, 80);

  const admin = adminClient();
  let query = admin
    .from("admin_audit_log")
    .select("id, actor_email, action, target_type, target_id, metadata, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) query = query.ilike("action", `%${q}%`);

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: "Impossible de charger le journal." });

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({ entries: data ?? [], total: count ?? 0, limit, offset });
}
