import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext, isAccountActive, isAdmin, isOrgMember, recordAudit } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isUuid, sanitizeText } from "@/lib/validation";
import { logEvent } from "@/lib/logger";
import {
  crosspostCaption,
  hashtagForOrg,
  publishFacebook,
  publishInstagram,
  type SocialResult,
} from "@/lib/social";
import { requireSameOrigin } from "@/lib/security";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!requireSameOrigin(req, res)) return;
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
  const [{ data: org }, { data: accounts, error }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", org_id).maybeSingle(),
    admin
      .from("organization_social_accounts")
      .select("platform, account_id, access_token")
      .eq("org_id", org_id)
      .in("platform", chosen),
  ]);

  if (error) return res.status(500).json({ error: "Lecture des comptes impossible." });

  const results: SocialResult[] = [];
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

  const { data: orgPost } = await admin
    .from("social_posts")
    .insert({
      org_id,
      author_id: ctx.user.id,
      caption: caption.trim(),
      image_url: imageUrl,
      link_url: linkUrl,
      platforms: chosen,
      results,
      scope: "organization",
    })
    .select("id")
    .maybeSingle();

  // Republish on the platform-owned pages. The org's own accounts are skipped
  // if they happen to be the same Page/IG account, to avoid duplicate posts.
  const centralResults: SocialResult[] = [];
  let centralHashtag: string | null = null;
  if (org?.name) {
    const orgAccountIds = new Set((accounts ?? []).map((a) => a.account_id));
    const central = (
      await admin
        .from("platform_social_accounts")
        .select("platform, account_id, access_token")
    ).data ?? [];

    const eligibleCentral = central.filter((a) => !orgAccountIds.has(a.account_id));
    if (eligibleCentral.length > 0) {
      const centralCaption = crosspostCaption(caption.trim(), org.name);
      centralHashtag = `${hashtagForOrg(org.name)} #YedLkhir`;
      for (const acc of eligibleCentral) {
        let token: string;
        try {
          token = decryptSecret(acc.access_token);
        } catch {
          centralResults.push({
            platform: acc.platform,
            ok: false,
            error: "Jeton central illisible : reconfigurez le compte plateforme.",
          });
          continue;
        }
        if (acc.platform === "facebook") {
          centralResults.push(
            await publishFacebook(
              acc.account_id,
              token,
              centralCaption,
              imageUrl,
              linkUrl,
            ),
          );
        } else {
          centralResults.push(
            await publishInstagram(acc.account_id, token, centralCaption, imageUrl),
          );
        }
      }

      await admin.from("social_posts").insert({
        org_id: null,
        source_org_id: org_id,
        source_post_id: orgPost?.id ?? null,
        author_id: ctx.user.id,
        caption: centralCaption,
        image_url: imageUrl,
        link_url: linkUrl,
        platforms: eligibleCentral.map((a) => a.platform),
        results: centralResults,
        scope: "crosspost",
      });
    }
  }

  if (centralResults.length > 0) {
    await recordAudit({
      actorId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: "social.crosspost",
      targetType: "social_post",
      targetId: orgPost?.id ?? undefined,
      metadata: {
        org_id,
        platforms: centralResults.map((result) => result.platform),
        ok: centralResults.filter((result) => result.ok).map((result) => result.platform),
      },
    });
  }

  const anyOk = results.some((r) => r.ok) || centralResults.some((r) => r.ok);
  logEvent(anyOk ? "info" : "warn", "social.publish", {
    org_id,
    platforms: chosen,
    ok: results.filter((r) => r.ok).map((r) => r.platform),
    central_ok: centralResults.filter((r) => r.ok).map((r) => r.platform),
  });
  return res.status(anyOk ? 200 : 502).json({
    results,
    central_results: centralResults,
    central_hashtag: centralHashtag,
  });
}
