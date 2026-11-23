import type { NextApiRequest, NextApiResponse } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { getEventCounts } from "@/lib/event-counts";
import { getAuthContext, isAccountActive, isAdmin, isOrgMember } from "@/lib/authz";
import {
  isUuid,
  queryId,
  sanitizeHostedUrl,
  sanitizeText,
  sanitizeUrl,
  isEmail,
  normalizePhone,
  isValidPhone,
} from "@/lib/validation";
import { withApiLog } from "@/lib/api-log";
import { buildBadgeTracks, earnedBadgeCount } from "@/lib/badges";
import type { Database } from "@/lib/supabase/types";

type OrgUpdate = Database["public"]["Tables"]["organizations"]["Update"];

const ORG_COLUMNS =
  "id, name, type, description, city, logo_url, verified, website, public_email, public_phone, facebook_url, instagram_url, rib_holder, bank_name, rib, donation_instructions, donation_url, created_at, owner_id";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return getOrganization(req, res);
  if (req.method === "PATCH") return updateContacts(req, res);
  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}

async function getOrganization(req: NextApiRequest, res: NextApiResponse) {
  const id = queryId(req.query.id);
  if (!isUuid(id)) {
    return res.status(400).json({ error: "Identifiant d'organisation invalide." });
  }

  const admin = adminClient();

  const [orgResult, eventsResult] = await Promise.all([
    admin
      .from("organizations")
      .select(ORG_COLUMNS)
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle(),
    admin
      .from("events")
      .select(
        "*, organizations(name, type, verified), event_categories(name, slug)",
      )
      .eq("org_id", id)
      .eq("status", "published")
      .order("start_at", { ascending: true }),
  ]);

  if (orgResult.error || eventsResult.error) {
    return res
      .status(500)
      .json({ error: "Impossible de charger cette organisation." });
  }

  if (!orgResult.data) {
    return res.status(404).json({ error: "Organisation introuvable." });
  }

  const events = eventsResult.data ?? [];
  const counts = await getEventCounts(events.map((event) => event.id));
  const eventsWithCounts = events.map((event) => {
    const c = counts[event.id] ?? { volunteers: 0, registrations: 0, total: 0 };
    return {
      ...event,
      volunteer_count: c.total,
      member_count: c.volunteers,
      registration_count: c.registrations,
    };
  });

  // Badge metrics count every action the organization created, drafts included.
  const { data: orgEvents } = await admin
    .from("events")
    .select("id, created_at")
    .eq("org_id", id);
  const allEvents = orgEvents ?? [];
  let volunteersReached = 0;
  if (allEvents.length > 0) {
    const { count } = await admin
      .from("volunteers")
      .select("event_id", { count: "exact", head: true })
      .in(
        "event_id",
        allEvents.map((event) => event.id),
      );
    volunteersReached = count ?? 0;
  }

  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  // Tenure follows the owner account so the same organization shows the same
  // Ancienneté here and on its public profile.
  const { data: ownerProfile } = await admin
    .from("profiles")
    .select("created_at")
    .eq("id", orgResult.data.owner_id)
    .maybeSingle();
  const tenureStart =
    ownerProfile?.created_at ?? orgResult.data.created_at ?? null;
  const createdAt = tenureStart ? new Date(tenureStart).getTime() : now;
  const tenureMonths = Math.max(
    0,
    Math.floor((now - createdAt) / (1000 * 60 * 60 * 24 * 30.4375)),
  );
  const recentEvents = allEvents.filter(
    (event) =>
      event.created_at && new Date(event.created_at).getTime() >= ninetyDaysAgo,
  ).length;
  const badgeTracks = buildBadgeTracks("organization", {
    tenureMonths,
    eventsCreated: allEvents.length,
    volunteersReached,
    actionsJoined: 0,
    momentum: recentEvents,
  });

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json({
    organization: orgResult.data,
    events: eventsWithCounts,
    badge_tracks: badgeTracks,
    badge_stats: {
      tenure_months: tenureMonths,
      events_created: allEvents.length,
      volunteers_reached: volunteersReached,
    },
    badges_earned: earnedBadgeCount(badgeTracks),
  });
}

/**
 * Organization owners/members edit the public contact block. Only contact
 * fields are writable here; identity/lifecycle fields stay admin-controlled.
 */
async function updateContacts(req: NextApiRequest, res: NextApiResponse) {
  const id = queryId(req.query.id);
  if (!isUuid(id)) {
    return res.status(400).json({ error: "Identifiant d'organisation invalide." });
  }

  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "Authentification requise." });
  if (!isAccountActive(ctx.profile)) {
    return res.status(403).json({ error: "Compte suspendu ou banni." });
  }
  const allowed = isAdmin(ctx.profile) || (await isOrgMember(ctx.user.id, id));
  if (!allowed) {
    return res.status(403).json({ error: "Vous ne gérez pas cette organisation." });
  }

  const body = req.body ?? {};
  const updates: OrgUpdate = {};

  if ("public_email" in body) {
    const email = sanitizeText(body.public_email, 160)?.trim() || null;
    if (email && !isEmail(email)) {
      return res.status(400).json({ error: "Adresse e-mail invalide." });
    }
    updates.public_email = email;
  }
  if ("public_phone" in body) {
    const raw = sanitizeText(body.public_phone, 40)?.trim() || null;
    if (raw && !isValidPhone(raw)) {
      return res.status(400).json({ error: "Numéro de téléphone invalide." });
    }
    updates.public_phone = raw ? normalizePhone(raw) : null;
  }
  if ("website" in body) {
    const url = sanitizeUrl(body.website);
    if (body.website && !url) {
      return res.status(400).json({ error: "Site web invalide." });
    }
    updates.website = url;
  }
  if ("facebook_url" in body) {
    const url = sanitizeHostedUrl(body.facebook_url, ["facebook.com"]);
    if (body.facebook_url && !url) {
      return res.status(400).json({ error: "Lien Facebook invalide." });
    }
    updates.facebook_url = url;
  }
  if ("instagram_url" in body) {
    const url = sanitizeHostedUrl(body.instagram_url, ["instagram.com"]);
    if (body.instagram_url && !url) {
      return res.status(400).json({ error: "Lien Instagram invalide." });
    }
    updates.instagram_url = url;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Aucun champ à mettre à jour." });
  }
  updates.updated_at = new Date().toISOString();

  const admin = adminClient();
  const { data, error } = await admin
    .from("organizations")
    .update(updates)
    .eq("id", id)
    .select(ORG_COLUMNS)
    .maybeSingle();

  if (error) {
    return res.status(400).json({ error: "Mise à jour impossible." });
  }
  if (!data) return res.status(404).json({ error: "Organisation introuvable." });

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({ organization: data });
}

export default withApiLog(handler);
