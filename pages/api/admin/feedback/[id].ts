import type { NextApiRequest, NextApiResponse } from "next";
import { recordAudit, requireAdmin } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { isUuid, oneOf, sanitizeText } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/security";

const STATUSES = ["open", "in_review", "resolved", "dismissed"] as const;

/** Update a feedback report's status / internal note. Admin only. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireSameOrigin(req, res)) return;
  if (!enforceRateLimit(req, res, "admin-feedback", 60, 60_000)) return;

  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  const id = req.query.id;
  if (typeof id !== "string" || !isUuid(id)) {
    return res.status(400).json({ error: "Identifiant invalide." });
  }

  const status = oneOf(req.body?.status, STATUSES);
  const noteRaw = req.body?.admin_note;
  const adminNote =
    noteRaw === undefined || noteRaw === null
      ? undefined
      : (sanitizeText(noteRaw, 1000) ?? "").trim() || null;

  if (!status && adminNote === undefined) {
    return res.status(400).json({ error: "Aucune modification fournie." });
  }

  const admin = adminClient();
  const patch: {
    status?: (typeof STATUSES)[number];
    admin_note?: string | null;
    resolved_at?: string | null;
    resolved_by?: string | null;
  } = {};
  if (status) {
    patch.status = status;
    const closed = status === "resolved" || status === "dismissed";
    patch.resolved_at = closed ? new Date().toISOString() : null;
    patch.resolved_by = closed ? ctx.user?.id ?? null : null;
  }
  if (adminNote !== undefined) patch.admin_note = adminNote;

  const { data, error } = await admin
    .from("feedback")
    .update(patch)
    .eq("id", id)
    .select(
      "id, type, subject, message, contact_email, user_id, status, admin_note, created_at, resolved_at, resolved_by",
    )
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: "Mise à jour impossible." });
  }
  if (!data) {
    return res.status(404).json({ error: "Signalement introuvable." });
  }

  await recordAudit({
    actorId: ctx.user?.id,
    actorEmail: ctx.user?.email,
    action: "feedback.update",
    targetType: "feedback",
    targetId: id,
    metadata: { status: status ?? undefined },
  });

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({ feedback: data });
}
