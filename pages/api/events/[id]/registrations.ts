import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext, isAdmin, canManageEvent } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/validation";

/**
 * Organizer-only roster for an event: account-free volunteer registrations
 * plus registered-user volunteers. Access is enforced server-side by
 * ownership (or admin), not by the UI.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id } = req.query;
  if (!isUuid(id)) {
    return res.status(400).json({ error: "Identifiant d'événement invalide." });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "Authentification requise." });

  const allowed = isAdmin(ctx.profile) || (await canManageEvent(ctx.user.id, id));
  if (!allowed) {
    return res.status(403).json({ error: "Vous ne gérez pas cet événement." });
  }

  const admin = adminClient();
  const [participants, volunteers] = await Promise.all([
    admin
      .from("event_participants")
      .select("id, full_name, email, phone, skills, message, status, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("volunteers")
      .select("id, profile_id, joined_at, profiles(full_name, phone)")
      .eq("event_id", id)
      .order("joined_at", { ascending: false }),
  ]);

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({
    registrations: participants.data ?? [],
    volunteers: volunteers.data ?? [],
    totals: {
      registrations: (participants.data ?? []).length,
      volunteers: (volunteers.data ?? []).length,
    },
  });
}
