import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext, isAccountActive, isAdmin, isOrgMember } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isUuid, sanitizeText } from "@/lib/validation";
import { logEvent } from "@/lib/logger";

const GRAPH = "https://graph.facebook.com/v21.0";

async function graphPost(path: string, params: Record<string, string>) {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(json?.error?.message || `Erreur Graph API (${res.status})`);
  }
  return json as { id?: string; post_id?: string };
}

type Result = { platform: string; ok: boolean; id?: string; error?: string };

async function publishFacebook(
  accountId: string,
  token: string,
  caption: string,
  imageUrl: string | null,
  linkUrl: string | null,
): Promise<Result> {
  try {
    if (imageUrl) {
      const r = await graphPost(`${accountId}/photos`, {
        url: imageUrl,
        caption,
        access_token: token,
      });
      return { platform: "facebook", ok: true, id: r.id };
    }
    const params: Record<string, string> = { message: caption, access_token: token };
    if (linkUrl) params.link = linkUrl;
    const r = await graphPost(`${accountId}/feed`, params);
    return { platform: "facebook", ok: true, id: r.id };
  } catch (e) {
    return { platform: "facebook", ok: false, error: (e as Error).message };
  }
}

async function publishInstagram(
  accountId: string,
  token: string,
  caption: string,
  imageUrl: string | null,
): Promise<Result> {
  try {
    if (!imageUrl) {
      return {
        platform: "instagram",
        ok: false,
        error: "Instagram exige une image accessible publiquement.",
      };
    }
    const container = await graphPost(`${accountId}/media`, {
      image_url: imageUrl,
      caption,
      access_token: token,
    });
    if (!container.id) {
      return { platform: "instagram", ok: false, error: "Création du média échouée." };
    }
    const published = await graphPost(`${accountId}/media_publish`, {
      creation_id: container.id,
      access_token: token,
    });
    return { platform: "instagram", ok: true, id: published.id };
  } catch (e) {
    return { platform: "instagram", ok: false, error: (e as Error).message };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!enforceRateLimit(req, res, "social-publish", 15, 10 * 60_000)) return;

  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "Authentification requise." });
  if (!isAccountActive(ctx.profile)) {
    return res.status(403).json({ error: "Compte suspendu ou banni." });
  }

  const { org_id, caption, image_url, link_url, platforms } = req.body ?? {};

  if (!isUuid(org_id)) {
    return res.status(400).json({ error: "Organisation invalide." });
  }
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ error: "Sélectionnez au moins un réseau" });
  }
  const chosen = platforms.filter((p: string) => p === "facebook" || p === "instagram");
  if (chosen.length === 0) {
    return res.status(400).json({ error: "Plateformes invalides" });
  }
  if (typeof caption !== "string" || caption.trim().length === 0) {
    return res.status(400).json({ error: "Le texte de la publication est requis" });
  }
  if (caption.length > 2200) {
    return res.status(400).json({ error: "Texte trop long (2200 caractères max)" });
  }
  const imageUrl = sanitizeText(image_url, 2048) || null;
  const linkUrl = sanitizeText(link_url, 2048) || null;

  const allowed = isAdmin(ctx.profile) || (await isOrgMember(ctx.user.id, org_id));
  if (!allowed) return res.status(403).json({ error: "Accès refusé." });

  const admin = adminClient();
  const { data: accounts, error } = await admin
    .from("organization_social_accounts")
    .select("platform, account_id, access_token")
    .eq("org_id", org_id)
    .in("platform", chosen);

  if (error) return res.status(500).json({ error: "Lecture des comptes impossible." });

  const results: Result[] = [];
  for (const platform of chosen) {
    const acc = (accounts ?? []).find((a) => a.platform === platform);
    if (!acc) {
      results.push({
        platform,
        ok: false,
        error: `Aucun compte ${platform} connecté pour cette organisation.`,
      });
      continue;
    }
    let token: string;
    try {
      token = decryptSecret(acc.access_token);
    } catch {
      results.push({
        platform,
        ok: false,
        error: "Jeton illisible : reconfigurez ce compte social.",
      });
      continue;
    }
    if (platform === "facebook") {
      results.push(
        await publishFacebook(acc.account_id, token, caption.trim(), imageUrl, linkUrl),
      );
    } else {
      results.push(await publishInstagram(acc.account_id, token, caption.trim(), imageUrl));
    }
  }

  // Log the attempt (never stores tokens). Best-effort.
  await admin.from("social_posts").insert({
    org_id,
    author_id: ctx.user.id,
    caption: caption.trim(),
    image_url: imageUrl,
    link_url: linkUrl,
    platforms: chosen,
    results,
  });

  const anyOk = results.some((r) => r.ok);
  logEvent(anyOk ? "info" : "warn", "social.publish", {
    org_id,
    platforms: chosen,
    ok: results.filter((r) => r.ok).map((r) => r.platform),
  });
  return res.status(anyOk ? 200 : 502).json({ results });
}
