import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/logger";
import {
  isEmail,
  isValidPhone,
  normalizePhone,
  oneOf,
  sanitizeText,
  trimmed,
} from "@/lib/validation";

const ORGANIZER_KINDS = [
  "individual",
  "association",
  "charity",
  "club",
  "ngo",
  "government",
  "other",
] as const;

/**
 * Organizer application. Creates the account (so it can later authenticate)
 * but the account starts with organizer_status = 'pending' and CANNOT log in
 * or reach protected functionality until an administrator approves it.
 * The public role is never taken from the client.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!enforceRateLimit(req, res, "signup", 5, 60 * 60 * 1000)) return;

  const body = req.body ?? {};
  const email = (trimmed(body.email, 254) ?? "").toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const name = sanitizeText(body.name, 160);
  const kind = oneOf(body.kind, ORGANIZER_KINDS);
  const contactName = sanitizeText(body.contact_name ?? body.fullName, 120);
  const phoneRaw = trimmed(body.phone, 30) ?? "";
  const city = sanitizeText(body.city, 80);
  const description = sanitizeText(body.description, 2000);
  const links = sanitizeText(body.links, 500);

  if (!isEmail(email)) {
    return res.status(400).json({ error: "Adresse e-mail invalide." });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
  }
  if (!name || name.length < 3) {
    return res
      .status(400)
      .json({ error: "Le nom de l'organisateur est requis (min. 3 caractères)." });
  }
  if (!kind) {
    return res.status(400).json({ error: "Type d'organisateur invalide." });
  }
  if (phoneRaw && !isValidPhone(phoneRaw)) {
    return res.status(400).json({ error: "Numéro de téléphone invalide." });
  }
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

  const supabase = createClient(req, res);

  // Create the auth account. The profile row is created by the
  // on_auth_user_created trigger, but every trusted field is (re)set
  // afterwards by the server — never taken from client metadata.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: contactName ?? name } },
  });

  if (error) {
    logEvent("warn", "signup.failed", { reason: error.message });
    // Do not reveal whether the account already exists.
    return res.status(400).json({
      error:
        "Impossible de créer la candidature. Vérifiez vos informations ou connectez-vous si vous avez déjà un compte.",
    });
  }

  const userId = data.user?.id;
  const admin = adminClient();

  if (userId) {
    // Server-controlled fields only.
    await admin
      .from("profiles")
      .update({
        full_name: contactName ?? name,
        phone,
        role: "individual",
        organizer_status: "pending",
      })
      .eq("id", userId);
  }

  // Reject duplicate open applications for the same email.
  const { data: existing } = await admin
    .from("organizer_applications")
    .select("id")
    .ilike("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (!existing) {
    const { error: appError } = await admin
      .from("organizer_applications")
      .insert({
        applicant_id: userId ?? null,
        name,
        kind,
        contact_name: contactName,
        email,
        phone,
        city,
        description,
        links,
        status: "pending",
      });
    if (appError) {
      logEvent("error", "signup.application_failed", { reason: appError.message });
      return res
        .status(500)
        .json({ error: "Candidature enregistrée partiellement. Contactez-nous." });
    }
  }

  logEvent("info", "signup.application_created", {
    email,
    kind,
    duplicate: !!existing,
  });

  return res.status(201).json({
    ok: true,
    status: "pending",
    message:
      "Votre candidature est enregistrée et sera examinée par notre équipe. Vous recevrez une réponse par e-mail.",
  });
}
