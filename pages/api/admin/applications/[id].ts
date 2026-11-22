import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin, recordAudit } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { isUuid, oneOf, sanitizeText } from "@/lib/validation";
import { logEvent } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/security";

const ACTIONS = ["approve", "reject", "request_info"] as const;

/** Review a single organizer application. */
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
  if (!requireSameOrigin(req, res)) return;
  if (!enforceRateLimit(req, res, "admin-application", 60, 60_000)) return;

  const action = oneOf(req.body?.action, ACTIONS);
  const note = sanitizeText(req.body?.note, 1000);
  if (!action) return res.status(400).json({ error: "Action invalide." });

  const admin = adminClient();
  const { data: app } = await admin
    .from("organizer_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!app) return res.status(404).json({ error: "Candidature introuvable." });

  const now = new Date().toISOString();
  const actorEmail = ctx.user?.email;

  if (action === "request_info") {
    await admin
      .from("organizer_applications")
      .update({ review_note: note ?? null, reviewed_by: ctx.user!.id, reviewed_at: now })
      .eq("id", id);
    await recordAudit({
      actorId: ctx.user!.id,
      actorEmail,
      action: "organizer.application.request_info",
      targetType: "organizer_application",
      targetId: id,
      metadata: { note },
    });
    return res.status(200).json({ ok: true, status: app.status });
  }

  if (action === "reject") {
    await admin
      .from("organizer_applications")
      .update({
        status: "rejected",
        review_note: note ?? null,
        reviewed_by: ctx.user!.id,
        reviewed_at: now,
      })
      .eq("id", id);
    if (app.applicant_id) {
      await admin
        .from("profiles")
        .update({ organizer_status: "rejected" })
        .eq("id", app.applicant_id);
    }
    await recordAudit({
      actorId: ctx.user!.id,
      actorEmail,
      action: "organizer.application.reject",
      targetType: "organizer_application",
      targetId: id,
      metadata: { note, email: app.email },
    });
    return res.status(200).json({ ok: true, status: "rejected" });
  }

  // approve
  if (!app.applicant_id) {
    return res.status(400).json({
      error:
        "Cette candidature n'est liée à aucun compte. Le candidat doit d'abord créer un compte.",
    });
  }

  const role = app.kind === "government" ? "government" : "organization";

  await admin
    .from("organizer_applications")
    .update({
      status: "approved",
      review_note: note ?? null,
      reviewed_by: ctx.user!.id,
      reviewed_at: now,
    })
    .eq("id", id);

  await admin
    .from("profiles")
    .update({ organizer_status: "approved", role })
    .eq("id", app.applicant_id);

  // Create the organization (or promote an existing one owned by the applicant).
  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_id", app.applicant_id)
    .maybeSingle();

  let orgId = existingOrg?.id;
  if (existingOrg) {
    await admin
      .from("organizations")
      .update({
        name: app.name,
        type: app.kind,
        description: app.description,
        city: app.city,
        status: "approved",
        verified: true,
      })
      .eq("id", existingOrg.id);
  } else {
    const { data: created, error: createError } = await admin
      .from("organizations")
      .insert({
        owner_id: app.applicant_id,
        name: app.name,
        type: app.kind,
        description: app.description,
        city: app.city,
        status: "approved",
        verified: true,
      })
      .select("id")
      .maybeSingle();
    if (createError || !created) {
      logEvent("error", "admin.approve.org_failed", { reason: createError?.message });
      return res.status(500).json({ error: "Organisation non créée. Réessayez." });
    }
    orgId = created.id;
  }

  if (orgId) {
    await admin
      .from("organization_members")
      .upsert(
        { org_id: orgId, profile_id: app.applicant_id, role_in_org: "admin" },
        { onConflict: "org_id,profile_id" },
      );
  }

  await recordAudit({
    actorId: ctx.user!.id,
    actorEmail,
    action: "organizer.application.approve",
    targetType: "organizer_application",
    targetId: id,
    metadata: { note, email: app.email, orgId },
  });

  return res.status(200).json({ ok: true, status: "approved", org_id: orgId });
}
