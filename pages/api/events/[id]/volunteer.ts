import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/supabase/api";
import { adminClient } from "@/lib/supabase/admin";
import { getEventCounts } from "@/lib/event-counts";
import { isUuid } from "@/lib/validation";
import { withApiLog } from "@/lib/api-log";

const TRIGGER_ERRORS: Record<string, number> = {
  "Cet événement est complet": 409,
  "Cet événement a déjà commencé": 400,
  "Cet événement n'est pas ouvert aux inscriptions": 400,
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id } = req.query;
  if (!isUuid(id)) {
    return res.status(400).json({ error: "Identifiant d'événement invalide." });
  }

  if (req.method === "POST") {
    return joinEvent(req, res, id);
  }
  if (req.method === "DELETE") {
    return leaveEvent(req, res, id);
  }
  return res.status(405).json({ error: "Method not allowed" });
}

async function joinEvent(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { supabase, user } = await getAuthUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const admin = adminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, status, start_at, max_volunteers")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    return res.status(404).json({ error: "Événement introuvable" });
  }
  if (event.status !== "published") {
    return res
      .status(400)
      .json({ error: "Cet événement n'est pas ouvert aux inscriptions" });
  }
  if (new Date(event.start_at).getTime() <= Date.now()) {
    return res.status(400).json({ error: "Cet événement a déjà commencé" });
  }
  if (event.max_volunteers !== null) {
    // Account-free registrations count toward capacity too.
    const counts = (await getEventCounts([id]))[id];
    if ((counts?.total ?? 0) >= event.max_volunteers) {
      return res.status(409).json({ error: "Cet événement est complet" });
    }
  }

  const { data, error } = await supabase
    .from("volunteers")
    .insert({ event_id: id, profile_id: user.id })
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Vous êtes déjà inscrit à cet événement" });
    }
    const status = TRIGGER_ERRORS[error.message] ?? 400;
    return res.status(status).json({ error: error.message });
  }

  return res.status(201).json({ volunteer: data });
}

async function leaveEvent(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
) {
  const { supabase, user } = await getAuthUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { error } = await supabase
    .from("volunteers")
    .delete()
    .eq("event_id", id)
    .eq("profile_id", user.id);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}

export default withApiLog(handler);
