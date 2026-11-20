import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext, isApprovedOrganizer, isAdmin, isAccountActive } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";

/** Organizations the caller owns or belongs to (organizer space). */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "Authentification requise." });
  if (!isAccountActive(ctx.profile)) {
    return res.status(403).json({ error: "Compte suspendu ou banni." });
  }
  if (!isApprovedOrganizer(ctx.profile) && !isAdmin(ctx.profile)) {
    return res.status(403).json({ error: "Compte organisateur non approuvé." });
  }

  const admin = adminClient();
  const { data, error } = await admin
    .from("organization_members")
    .select("role_in_org, organizations(id, name, type, city, verified, status, logo_url)")
    .eq("profile_id", ctx.user.id);

  if (error) {
    return res.status(500).json({ error: "Impossible de charger vos organisations." });
  }

  const organizations = (data ?? []).map((m) => ({
    ...(Array.isArray(m.organizations) ? m.organizations[0] : m.organizations),
    role_in_org: m.role_in_org,
  }));

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({ organizations });
}
