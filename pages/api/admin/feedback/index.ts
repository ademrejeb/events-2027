import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { oneOf } from "@/lib/validation";
import { withApiLog } from "@/lib/api-log";

const STATUSES = ["open", "in_review", "resolved", "dismissed"] as const;
const TYPES = ["improvement", "bug", "data", "other"] as const;

/** Admin-only feedback inbox. */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  const status = oneOf(req.query.status, STATUSES);
  const type = oneOf(req.query.type, TYPES);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

  const admin = adminClient();
  let query = admin
    .from("feedback")
    .select(
      "id, type, subject, message, contact_email, user_id, status, admin_note, created_at, resolved_at, resolved_by",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);

  const [{ data, error }, ...counts] = await Promise.all([
    query,
    ...(["open", "in_review", "resolved", "dismissed"] as const).map((value) =>
      admin
        .from("feedback")
        .select("id", { count: "exact", head: true })
        .eq("status", value),
    ),
  ]);

  if (error) {
    return res.status(500).json({ error: "Impossible de charger les signalements." });
  }

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({
    feedback: data ?? [],
    counts: {
      open: counts[0]?.count ?? 0,
      in_review: counts[1]?.count ?? 0,
      resolved: counts[2]?.count ?? 0,
      dismissed: counts[3]?.count ?? 0,
    },
  });
}

export default withApiLog(handler);
