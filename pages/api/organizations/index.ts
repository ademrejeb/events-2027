import type { NextApiRequest, NextApiResponse } from "next";
import { requireOrganizer } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { OrganizationType } from "@/lib/supabase/types";
import { clampInt, oneOf, sanitizeText } from "@/lib/validation";

const TYPES = [
  "individual",
  "association",
  "charity",
  "club",
  "ngo",
  "government",
  "other",
] as const;

/** Public organizer directory + safe organization creation. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") return listOrganizations(req, res);
  if (req.method === "POST") return createOrganization(req, res);
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}

const DIRECTORY_COLUMNS =
  "id, name, type, description, city, logo_url, verified, status, website, created_at";

async function listOrganizations(req: NextApiRequest, res: NextApiResponse) {
  const search = sanitizeText(req.query.q, 80);
  const city = sanitizeText(req.query.city, 80);
  const type = oneOf(req.query.type, TYPES);
  const limit = clampInt(req.query.limit ?? 24, 1, 60) ?? 24;
  const offset = clampInt(req.query.offset ?? 0, 0, 100000) ?? 0;

  // Public directory: only approved organizations, read via the service role so
  // the response never depends on permissive table policies.
  let query = adminClient()
    .from("organizations")
    .select(DIRECTORY_COLUMNS, { count: "exact" })
    .eq("status", "approved")
    .order("verified", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.ilike("name", `%${search}%`);
  if (city) query = query.eq("city", city);
  if (type) query = query.eq("type", type);

  const { data, count, error } = await query;

  if (error) {
    return res.status(500).json({ error: "Impossible de charger les organisations." });
  }

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json({
    organizations: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}

async function createOrganization(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Creating an organization requires an approved organizer account.
  const ctx = await requireOrganizer(req, res);
  if (!ctx) return;

  const name = sanitizeText(req.body?.name, 160);
  const type = oneOf(req.body?.type, TYPES) as OrganizationType | null;
  const description = sanitizeText(req.body?.description, 2000);
  const city = sanitizeText(req.body?.city, 80);

  if (!name || name.length < 3) {
    return res.status(400).json({ error: "Nom requis (min. 3 caractères)." });
  }
  if (!type) return res.status(400).json({ error: "Type d'organisation invalide." });

  const admin = adminClient();

  // One organization per owner keeps ownership unambiguous.
  const { data: existing } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_id", ctx.user!.id)
    .maybeSingle();
  if (existing) {
    return res.status(409).json({ error: "Vous avez déjà une organisation." });
  }

  const { data: org, error } = await admin
    .from("organizations")
    .insert({
      owner_id: ctx.user!.id,
      name,
      type,
      description,
      city,
      status: "approved",
      verified: false,
    })
    .select("*")
    .single();

  if (error || !org) {
    return res.status(400).json({ error: "Création impossible." });
  }

  await admin
    .from("organization_members")
    .upsert(
      { org_id: org.id, profile_id: ctx.user!.id, role_in_org: "admin" },
      { onConflict: "org_id,profile_id" },
    );

  return res.status(201).json({ organization: org });
}
