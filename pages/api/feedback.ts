import type { NextApiRequest, NextApiResponse } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/supabase/api";
import { clientIp, enforceRateLimit } from "@/lib/rate-limit";
import { logEvent, sameOrigin, sha256Hex } from "@/lib/logger";
import { isEmail, oneOf, sanitizeText } from "@/lib/validation";

export const FEEDBACK_TYPES = ["improvement", "bug", "data", "other"] as const;

/**
 * Public feedback intake (About page). Server-only insert: the feedback table
 * has no public RLS policy, so contact details never leak to clients.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Cross-site form posts: reject when an Origin is supplied and mismatched.
  const origin = req.headers.origin;
  if (origin && !sameOrigin(req)) {
    return res.status(403).json({ error: "Origine non autorisée." });
  }

  if (!enforceRateLimit(req, res, "feedback:ip", 3, 10 * 60 * 1000)) return;

  const body = req.body ?? {};

  // Honeypot: bots fill hidden fields. Pretend success, store nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return res.status(200).json({ ok: true });
  }

  const type = oneOf(body.type, FEEDBACK_TYPES) ?? "other";
  const subject = (sanitizeText(body.subject, 160) ?? "").trim();
  const message = (sanitizeText(body.message, 4000) ?? "").trim();
  const contactRaw = sanitizeText(body.contact_email, 254);
  const contactEmail = contactRaw ? contactRaw.trim().toLowerCase() : null;

  if (subject.length < 3) {
    return res.status(400).json({ error: "Indiquez un sujet (3 caractères min.)." });
  }
  if (message.length < 10) {
    return res.status(400).json({ error: "Décrivez votre message (10 caractères min.)." });
  }
  if (contactEmail && !isEmail(contactEmail)) {
    return res.status(400).json({ error: "Adresse e-mail invalide." });
  }

  const { user } = await getAuthUser(req, res);
  const ipHash = await sha256Hex(
    `${clientIp(req)}:${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 8)}`,
  );

  const { data, error } = await adminClient()
    .from("feedback")
    .insert({
      type,
      subject,
      message,
      contact_email: contactEmail,
      user_id: user?.id ?? null,
      ip_hash: ipHash,
      status: "open",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    logEvent("error", "feedback.insert_failed", { reason: error.message });
    return res
      .status(500)
      .json({ error: "Envoi impossible pour le moment. Réessayez plus tard." });
  }

  logEvent("info", "feedback.created", { id: data?.id, type });
  res.setHeader("Cache-Control", "no-store");
  return res.status(201).json({
    ok: true,
    message: "Merci ! Votre message a bien été transmis à l'équipe.",
  });
}
