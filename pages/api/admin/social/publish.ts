import type { NextApiRequest, NextApiResponse } from "next";
import { recordAudit, requireAdmin } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/logger";
import {
  publishFacebook,
  publishInstagram,
  type SocialPlatform,
  type SocialResult,
} from "@/lib/social";
import { requireSameOrigin } from "@/lib/security";
import { sanitizeText, sanitizeUrl } from "@/lib/validation";

/** Publish from the platform-owned Facebook Page / Instagram account. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireSameOrigin(req, res)) return;
  if (!enforceRateLimit(req, res, "admin-social-publish", 10, 10 * 60_000)) return;

  const caption = sanitizeText(req.body?.caption, 2200)?.trim() || "";
  if (caption.length < 2) {
    return res.status(400).json({ error: "Le texte de la publication est requis." });
  }

  const imageUrl = sanitizeUrl(req.body?.image_url);
  if (req.body?.image_url && !imageUrl) {
    return res.status(400).json({ error: "Image invalide." });
  }
  if (imageUrl && !imageUrl.startsWith("https://")) {
    return res.status(400).json({ error: "L’image doit être une URL HTTPS publique." });
  }
  const linkUrl = sanitizeUrl(req.body?.link_url);
  if (req.body?.link_url && !linkUrl) {
    return res.status(400).json({ error: "Lien invalide." });
  }

  const requested = Array.isArray(req.body?.platforms) ? req.body.platforms : [];
  const chosen = requested.filter(
    (platform: unknown): platform is SocialPlatform =>
      platform === "facebook" || platform === "instagram",
  );
  if (chosen.length === 0) {
    return res.status(400).json({ error: "Sélectionnez au moins un réseau." });
  }

  const admin = adminClient();
  const { data: accounts, error } = await admin
    .from("platform_social_accounts")
    .select("platform, account_id, access_token")
    .in("platform", chosen);
  if (error) return res.status(500).json({ error: "Lecture des comptes impossible." });

  if ((accounts ?? []).length === 0) {
    return res.status(400).json({
      error: "Aucun compte central n’est connecté. Configurez Facebook ou Instagram d’abord.",
    });
  }

  const results: SocialResult[] = [];
  for (const platform of chosen) {
    const account = (accounts ?? []).find((row) => row.platform === platform);
    if (!account) {
      results.push({ platform, ok: false, error: `Compte ${platform} non connecté.` });
      continue;
    }
    let token: string;
    try {
      token = decryptSecret(account.access_token);
    } catch {
      results.push({
        platform,
        ok: false,
        error: "Jeton illisible : reconfigurez ce compte.",
      });
      continue;
    }
    if (platform === "facebook") {
      results.push(
        await publishFacebook(account.account_id, token, caption, imageUrl || null, linkUrl || null),
      );
    } else {
      results.push(await publishInstagram(account.account_id, token, caption, imageUrl || null));
    }
  }

  await admin.from("social_posts").insert({
    org_id: null,
    scope: "platform",
    author_id: ctx.user!.id,
    caption,
    image_url: imageUrl || null,
    link_url: linkUrl || null,
    platforms: chosen,
    results,
  });

  await recordAudit({
    actorId: ctx.user!.id,
    actorEmail: ctx.user?.email,
    action: "social.publish",
    targetType: "platform_social_post",
    metadata: {
      platforms: chosen,
      ok: results.filter((result) => result.ok).map((result) => result.platform),
    },
  });
  logEvent("info", "social.platform_publish", {
    platforms: chosen,
    ok: results.filter((result) => result.ok).map((result) => result.platform),
  });

  const anyOk = results.some((result) => result.ok);
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(anyOk ? 200 : 502).json({ results });
}
