import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/supabase/api";
import { getAuthContext, isAdmin, canManageEvent } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { getEventCounts } from "@/lib/event-counts";
import { sanitizeText, sanitizeUrlList, clampInt, validDate, isUuid, oneOf } from "@/lib/validation";
import { withApiLog } from "@/lib/api-log";
import type { Database } from "@/lib/supabase/types";

type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id } = req.query;
  if (!isUuid(id)) {
    return res.status(400).json({ error: "Identifiant d'événement invalide." });
  }

  if (req.method === "GET") return getEvent(req, res, id);
  if (req.method === "PATCH") return updateEvent(req, res, id);
  if (req.method === "DELETE") return deleteEvent(req, res, id);
  res.setHeader("Allow", "GET, PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}

/**
 * Public event detail. No personal data (volunteer names/contacts) is ever
 * returned here — only aggregate counts. Organizers retrieve the registration
 * roster from /api/events/[id]/registrations (owner-only).
 */
async function getEvent(req: NextApiRequest, res: NextApiResponse, id: string) {
  const { supabase } = await getAuthUser(req, res);

  const columns =
    "id, org_id, title, description, category_id, location, city, locations, start_at, end_at, max_volunteers, status, created_at, image_url, lat, lng, gallery_urls, before_images, after_images, organizations(id, name, type, verified, status, public_email, public_phone, website, facebook_url, instagram_url), event_categories(name, slug)";

  const { data, error } = await supabase
    .from("events")
    .select(columns)
    .eq("id", id)
    .maybeSingle();

  const event = data as Record<string, unknown> | null;

  if (error) {
    return res
      .status(500)
      .json({ error: "Impossible de charger l'événement pour le moment." });
  }
  if (!event) return res.status(404).json({ error: "Événement introuvable." });

  // Aggregate counts only, computed with the service role: rosters and
  // account-free registrations are no longer publicly readable.
  const counts = (await getEventCounts([id]))[id] ?? {
    volunteers: 0,
    registrations: 0,
    total: 0,
  };

  // Whether the current (authenticated) viewer has joined as a community member
  // or already registered (possibly earlier, as a guest).
  let joined = false;
  let registered = false;
  let can_manage = false;
  const ctx = await getAuthContext(req, res);
  if (ctx.user) {
    const admin = adminClient();
    const email = ctx.user.email?.toLowerCase();
    const [{ data: mine }, { data: mineByProfile }, { data: mineByEmail }, manages] =
      await Promise.all([
        admin
          .from("volunteers")
          .select("profile_id")
          .eq("event_id", id)
          .eq("profile_id", ctx.user.id)
          .maybeSingle(),
        admin
          .from("event_participants")
          .select("id")
          .eq("event_id", id)
          .eq("profile_id", ctx.user.id)
          .maybeSingle(),
        email
          ? admin
              .from("event_participants")
              .select("id")
              .eq("event_id", id)
              .ilike("email", email)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        isAdmin(ctx.profile) ? Promise.resolve(true) : canManageEvent(ctx.user.id, id),
      ]);
    joined = !!mine;
    registered = !!mineByProfile || !!mineByEmail;
    can_manage = manages;
  }

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({
    event,
    volunteer_count: counts.volunteers,
    participant_count: counts.registrations,
    total_count: counts.total,
    joined,
    registered,
    can_manage,
  });
}

async function updateEvent(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
) {
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "Authentification requise." });

  // Server-side ownership check (independent of the UI and of RLS).
  const allowed = isAdmin(ctx.profile)
    ? true
    : await canManageEvent(ctx.user.id, id);
  if (!allowed) {
    return res.status(403).json({ error: "Vous ne gérez pas cet événement." });
  }

  const body = req.body ?? {};
  const updates: Record<string, unknown> = {};

  if ("title" in body) updates.title = sanitizeText(body.title, 160);
  if ("description" in body) updates.description = sanitizeText(body.description, 5000);
  if ("city" in body) updates.city = sanitizeText(body.city, 80);
  if ("location" in body) updates.location = sanitizeText(body.location, 200);
  if ("category_id" in body) updates.category_id = body.category_id || null;
  if ("start_at" in body) {
    const v = validDate(body.start_at);
    if (!v) return res.status(400).json({ error: "Date de début invalide." });
    updates.start_at = v;
  }
  if ("end_at" in body) {
    const v = validDate(body.end_at);
    if (!v) return res.status(400).json({ error: "Date de fin invalide." });
    updates.end_at = v;
  }
  if ("max_volunteers" in body) {
    updates.max_volunteers =
      body.max_volunteers === null ? null : clampInt(body.max_volunteers, 1, 100000);
  }
  if ("status" in body) {
    const status = oneOf(body.status, ["draft", "published", "cancelled", "completed"] as const);
    if (!status) return res.status(400).json({ error: "Statut invalide." });
    updates.status = status;
  }
  if ("image_url" in body) updates.image_url = sanitizeText(body.image_url, 2048) || null;
  if ("before_images" in body) updates.before_images = sanitizeUrlList(body.before_images);
  if ("after_images" in body) updates.after_images = sanitizeUrlList(body.after_images);
  if ("lat" in body) {
    const n = typeof body.lat === "number" ? body.lat : Number(body.lat);
    updates.lat = Number.isFinite(n) && n >= -90 && n <= 90 ? n : null;
  }
  if ("lng" in body) {
    const n = typeof body.lng === "number" ? body.lng : Number(body.lng);
    updates.lng = Number.isFinite(n) && n >= -180 && n <= 180 ? n : null;
  }
  if ("locations" in body) {
    const raw: unknown[] = Array.isArray(body.locations) ? body.locations : [];
    updates.locations = raw
      .filter(
        (l: unknown): l is { label?: string; lat: number; lng: number } =>
          !!l &&
          typeof l === "object" &&
          typeof (l as { lat: unknown }).lat === "number" &&
          typeof (l as { lng: unknown }).lng === "number" &&
          Number.isFinite((l as { lat: number }).lat) &&
          Number.isFinite((l as { lng: number }).lng) &&
          (l as { lat: number }).lat >= -90 &&
          (l as { lat: number }).lat <= 90 &&
          (l as { lng: number }).lng >= -180 &&
          (l as { lng: number }).lng <= 180,
      )
      .slice(0, 20)
      .map((l) => ({
        label: sanitizeText(l.label, 120) ?? "Lieu",
        lat: l.lat,
        lng: l.lng,
      }));
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Aucun champ à mettre à jour." });
  }

  const { supabase } = await getAuthUser(req, res);
  const { data, error } = await supabase
    .from("events")
    .update(updates as EventUpdate)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return res.status(403).json({ error: "Mise à jour refusée." });
  if (!data) return res.status(404).json({ error: "Événement introuvable." });
  return res.status(200).json({ event: data });
}

async function deleteEvent(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
) {
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "Authentification requise." });

  const allowed = isAdmin(ctx.profile)
    ? true
    : await canManageEvent(ctx.user.id, id);
  if (!allowed) {
    return res.status(403).json({ error: "Vous ne gérez pas cet événement." });
  }

  const { supabase } = await getAuthUser(req, res);
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return res.status(403).json({ error: "Suppression refusée." });
  return res.status(200).json({ ok: true });
}

export default withApiLog(handler);
