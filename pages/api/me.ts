import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext, isAccountActive } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone, sanitizeText } from "@/lib/validation";
import { sameOrigin } from "@/lib/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const ctx = await getAuthContext(req, res);

  if (!ctx.user || !ctx.profile) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Suspended/banned sessions are cut off here even if the JWT is still valid.
  if (!isAccountActive(ctx.profile)) {
    return res.status(403).json({
      error: "Compte suspendu ou banni",
      account_status: ctx.profile.account_status,
    });
  }

  if (req.method === "GET") {
    const p = ctx.profile;
    return res.status(200).json({
      user: ctx.user,
      profile: {
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        bio: p.bio,
        avatar_url: p.avatar_url,
        role: p.role,
        created_at: p.created_at,
      },
      account: {
        status: p.account_status ?? "active",
        organizer_status: p.organizer_status ?? "none",
        is_admin: !!p.is_admin,
      },
    });
  }

  if (req.method === "PATCH") {
    // State-changing cookie-auth request: enforce same-origin (CSRF defence).
    if (!sameOrigin(req)) {
      return res.status(403).json({ error: "Requête refusée (origine invalide)." });
    }

    const updates: {
      full_name?: string | null;
      phone?: string | null;
      bio?: string | null;
      avatar_url?: string | null;
    } = {};

    if ("full_name" in req.body) updates.full_name = sanitizeText(req.body.full_name, 120);
    if ("phone" in req.body)
      updates.phone = req.body.phone ? normalizePhone(String(req.body.phone)) : null;
    if ("bio" in req.body) updates.bio = sanitizeText(req.body.bio, 600);
    if ("avatar_url" in req.body) {
      const url = req.body.avatar_url;
      updates.avatar_url = typeof url === "string" && /^https?:\/\//.test(url) ? url : null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour." });
    }

    // RLS restricts updates to the caller's own row.
    const supabase = createClient(req, res);
    const { data: profile } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", ctx.user.id)
      .select()
      .single();

    return res.status(200).json({ profile });
  }

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}
