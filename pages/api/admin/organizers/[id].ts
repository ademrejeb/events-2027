import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin, recordAudit } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { isUuid, oneOf, sanitizeText } from "@/lib/validation";
import { logEvent } from "@/lib/logger";

const ACTIONS = [
  "suspend",
  "reinstate",
  "ban",
  "approve",
  "grant_admin",
  "revoke_admin",
  "verify_org",
  "unverify_org",
] as const;

/**
 * Manage an organizer account (id = profile id). Status changes on the profile
 * immediately restrict API access; sessions are also revoked globally so the
 * client cannot keep using a stale token.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  const { id } = req.query;
  if (!isUuid(id)) return res.status(400).json({ error: "Identifiant invalide." });
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const action = oneOf(req.body?.action, ACTIONS);
  const reason = sanitizeText(req.body?.reason, 500);
  if (!action) return res.status(400).json({ error: "Action invalide." });

  if (id === ctx.user!.id && (action === "suspend" || action === "ban" || action === "revoke_admin")) {
    return res
      .status(400)
      .json({ error: "Vous ne pouvez pas appliquer cette action à votre propre compte." });
  }

  const admin = adminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, role, account_status, organizer_status, is_admin")
    .eq("id", id)
    .maybeSingle();
  if (!target) return res.status(404).json({ error: "Compte introuvable." });

  const now = new Date().toISOString();
  const profileUpdate: Record<string, unknown> = {};
  let auditAction: Parameters<typeof recordAudit>[0]["action"] | null = null;
  let revokeSessions = false;

  switch (action) {
    case "suspend":
      profileUpdate.account_status = "suspended";
      profileUpdate.organizer_status = "suspended";
      profileUpdate.suspended_at = now;
      profileUpdate.status_reason = reason ?? null;
      auditAction = "organizer.suspend";
      revokeSessions = true;
      break;
    case "ban":
      profileUpdate.account_status = "banned";
      profileUpdate.organizer_status = "banned";
      profileUpdate.suspended_at = now;
      profileUpdate.status_reason = reason ?? null;
      auditAction = "organizer.ban";
      revokeSessions = true;
      break;
    case "reinstate":
      profileUpdate.account_status = "active";
      profileUpdate.organizer_status = "approved";
      profileUpdate.suspended_at = null;
      profileUpdate.status_reason = null;
      auditAction = "organizer.reinstate";
      break;
    case "approve":
      profileUpdate.account_status = "active";
      profileUpdate.organizer_status = "approved";
      profileUpdate.role = "organization";
      auditAction = "organizer.application.approve";
      break;
    case "grant_admin":
      profileUpdate.is_admin = true;
      auditAction = "admin.grant";
      break;
    case "revoke_admin":
      profileUpdate.is_admin = false;
      auditAction = "admin.revoke";
      revokeSessions = true;
      break;
    case "verify_org":
    case "unverify_org": {
      const verify = action === "verify_org";
      const { error } = await admin
        .from("organizations")
        .update({ verified: verify, status: verify ? "approved" : "pending" })
        .eq("owner_id", id);
      if (error) return res.status(500).json({ error: "Mise à jour impossible." });
      await recordAudit({
        actorId: ctx.user!.id,
        actorEmail: ctx.user?.email,
        action: "organizer.update",
        targetType: "organizations",
        targetId: id,
        metadata: { action, verify },
      });
      return res.status(200).json({ ok: true });
    }
  }

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await admin
      .from("profiles")
      .update(profileUpdate as never)
      .eq("id", id);
    if (error) {
      logEvent("error", "admin.organizer.update_failed", { reason: error.message });
      return res.status(500).json({ error: "Mise à jour impossible." });
    }
  }

  if (revokeSessions) {
    try {
      await admin.auth.admin.signOut(id, "global");
    } catch (err) {
      logEvent("warn", "admin.signout_failed", { userId: id, reason: (err as Error).message });
    }
  }

  if (auditAction) {
    await recordAudit({
      actorId: ctx.user!.id,
      actorEmail: ctx.user?.email,
      action: auditAction,
      targetType: "profile",
      targetId: id,
      metadata: { reason, action },
    });
  }

  return res.status(200).json({ ok: true, action });
}
