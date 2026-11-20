import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/logger";
import { isEmail, trimmed } from "@/lib/validation";

/**
 * Organizer/admin login.
 *
 * Only accounts in good standing may authenticate:
 *  - account_status must not be suspended/banned
 *  - organizer_status must be 'approved' (or the account is an admin)
 * Accounts still pending/rejected are refused so they never obtain a session.
 *
 * Credential failures stay generic and do not reveal account existence.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Brute-force protection: 10 attempts / 10 min per IP.
  if (!enforceRateLimit(req, res, "login", 10, 10 * 60 * 1000)) return;

  const email = (trimmed(req.body?.email, 254) ?? "").toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!isEmail(email) || !password) {
    return res.status(400).json({ error: "Identifiants invalides." });
  }

  const supabase = createClient(req, res);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    logEvent("warn", "login.invalid_credentials", { email });
    return res.status(401).json({ error: "E-mail ou mot de passe incorrect." });
  }

  // Status gate — evaluated server-side from the database (client-forged
  // status values are ignored entirely).
  const admin = adminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("account_status, organizer_status, is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  const accountStatus = profile?.account_status ?? "active";
  const organizerStatus = profile?.organizer_status ?? "none";
  const isAdminUser = !!profile?.is_admin;

  let blocked: string | null = null;
  if (accountStatus === "banned") {
    blocked = "Votre compte a été banni. Contactez le support.";
  } else if (accountStatus === "suspended") {
    blocked = "Votre compte est temporairement suspendu.";
  } else if (!isAdminUser && organizerStatus === "pending") {
    blocked = "Votre candidature est encore en cours d'examen.";
  } else if (!isAdminUser && organizerStatus === "rejected") {
    blocked = "Votre candidature a été refusée. Vous pouvez en soumettre une nouvelle.";
  } else if (!isAdminUser && organizerStatus === "suspended") {
    blocked = "Votre compte organisateur est suspendu.";
  } else if (!isAdminUser && organizerStatus === "banned") {
    blocked = "Votre compte organisateur a été banni.";
  } else if (!isAdminUser && organizerStatus !== "approved") {
    blocked = "Un compte organisateur approuvé est requis pour se connecter.";
  }

  if (blocked) {
    // Invalidate the freshly created session so no usable cookie remains.
    await supabase.auth.signOut();
    logEvent("warn", "login.blocked", {
      email,
      accountStatus,
      organizerStatus,
    });
    return res.status(403).json({ error: blocked });
  }

  // Ensure refreshed session cookies are written to the response.
  await supabase.auth.getUser();
  logEvent("info", "login.success", { userId: data.user.id, isAdmin: isAdminUser });

  return res.status(200).json({ user: data.user, session: data.session });
}
