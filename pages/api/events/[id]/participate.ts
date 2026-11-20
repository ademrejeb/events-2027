import type { NextApiRequest, NextApiResponse } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/authz";
import { enforceRateLimit, clientIp, rateLimit } from "@/lib/rate-limit";
import { getEventCounts } from "@/lib/event-counts";
import { logEvent, sha256Hex } from "@/lib/logger";
import { withApiLog } from "@/lib/api-log";
import type { Database } from "@/lib/supabase/types";
import {
  isEmail,
  isUuid,
  isValidPhone,
  normalizePhone,
  sanitizeText,
} from "@/lib/validation";

/**
 * Account-free volunteer registration.
 *
 * Hardened: server-side validation, per-IP + per-email rate limiting,
 * duplicate prevention, capacity enforcement, strict field allow-listing,
 * and no sensitive data (IP/PII hashes) returned to the client.
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id } = req.query;
  if (!isUuid(id)) {
    return res.status(400).json({ error: "Identifiant d'événement invalide." });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Abuse protection: 5 sign-ups / 10 min per IP, 3 / 10 min per email.
  if (!enforceRateLimit(req, res, "participate:ip", 5, 10 * 60 * 1000)) return;

  const body = req.body ?? {};
  const fullName = sanitizeText(body.full_name, 120);
  const emailRaw = sanitizeText(body.email, 254);
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const phoneRaw = sanitizeText(body.phone, 30) ?? "";
  const skills = sanitizeText(body.skills, 400);
  const message = sanitizeText(body.message, 800);
  const privacyAccepted = body.privacy_accepted === true;

  if (!fullName || fullName.length < 3) {
    return res.status(400).json({ error: "Nom complet requis (min. 3 caractères)." });
  }
  if (!email || !isEmail(email)) {
    return res.status(400).json({ error: "Adresse e-mail valide requise." });
  }
  if (!phoneRaw || !isValidPhone(phoneRaw)) {
    return res.status(400).json({ error: "Numéro de téléphone valide requis." });
  }
  if (!privacyAccepted) {
    return res.status(400).json({ error: "Vous devez accepter la politique de confidentialité." });
  }

  // Per-address limit (the IP limit above is not enough on shared networks).
  const emailLimit = rateLimit(
    `participate:email:${email}`,
    3,
    10 * 60 * 1000,
  );
  if (!emailLimit.ok) {
    res.setHeader("Retry-After", String(emailLimit.retryAfterSec));
    return res.status(429).json({
      error: "Trop d'inscriptions depuis cet e-mail. Réessayez plus tard.",
    });
  }

  const phone = normalizePhone(phoneRaw);
  const admin = adminClient();
  const ctx = await getAuthContext(req, res);
  const profileId = ctx.user?.id ?? null;
  const accountEmail = ctx.user?.email?.toLowerCase() ?? null;

  const { data: event } = await admin
    .from("events")
    .select("id, status, start_at, max_volunteers")
    .eq("id", id)
    .maybeSingle();

  if (!event) return res.status(404).json({ error: "Événement introuvable." });
  if (event.status !== "published") {
    return res
      .status(400)
      .json({ error: "Cet événement n'est pas ouvert aux inscriptions." });
  }
  if (new Date(event.start_at).getTime() <= Date.now()) {
    return res.status(400).json({ error: "Cet événement a déjà commencé." });
  }

  // Duplicate prevention: same e-mail, or same signed-in account (which may
  // have registered earlier as a guest with another address).
  const [{ data: existing }, { data: existingProfile }, { data: existingAccountEmail }] =
    await Promise.all([
    admin
      .from("event_participants")
      .select("id")
      .eq("event_id", id)
      .ilike("email", email)
      .maybeSingle(),
    profileId
      ? admin
          .from("event_participants")
          .select("id")
          .eq("event_id", id)
          .eq("profile_id", profileId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    accountEmail && accountEmail !== email
      ? admin
          .from("event_participants")
          .select("id")
          .eq("event_id", id)
          .ilike("email", accountEmail)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (existing || existingProfile || existingAccountEmail) {
    return res.status(409).json({
      error: "Vous êtes déjà inscrit(e) à cet événement.",
      already_registered: true,
    });
  }

  // Capacity check — one inscription = one person, and registered community
  // members share the same capacity.
  if (event.max_volunteers !== null && event.max_volunteers !== undefined) {
    const counts = (await getEventCounts([id]))[id];
    if ((counts?.total ?? 0) >= event.max_volunteers) {
      return res.status(409).json({ error: "Cet événement est complet." });
    }
  }

  const emailHash = await sha256Hex(email);
  const ipHash = await sha256Hex(`${clientIp(req)}:${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 8)}`);

  const payload: Database["public"]["Tables"]["event_participants"]["Insert"] = {
    event_id: id,
    profile_id: profileId,
    full_name: fullName,
    phone,
    email,
    participants_count: 1,
    skills,
    message,
    status: "submitted",
    email_hash: emailHash,
    ip_hash: ipHash,
    privacy_accepted_at: new Date().toISOString(),
  };

  let inserted = await admin
    .from("event_participants")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (
    inserted.error &&
    (inserted.error.code === "PGRST204" ||
      inserted.error.message.includes("profile_id"))
  ) {
    const legacyPayload = { ...payload };
    delete legacyPayload.profile_id;
    inserted = await admin
      .from("event_participants")
      .insert(legacyPayload)
      .select("id")
      .maybeSingle();
  }

  const { data, error } = inserted;

  if (error) {
    // Unique index race → treat as duplicate.
    if (error.code === "23505") {
      return res.status(409).json({
        error: "Vous êtes déjà inscrit(e) à cet événement.",
        already_registered: true,
      });
    }
    logEvent("error", "participate.failed", { reason: error.message, eventId: id });
    return res.status(400).json({ error: "Inscription impossible. Réessayez plus tard." });
  }

  logEvent("info", "participate.created", { eventId: id, emailHash });

  // Never echo submitted PII beyond a confirmation id.
  return res.status(201).json({
    ok: true,
    registration: { id: data?.id },
    message: "Votre inscription a bien été enregistrée. Merci !",
  });
}

export default withApiLog(handler);
