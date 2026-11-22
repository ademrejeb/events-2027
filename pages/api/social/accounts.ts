import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthContext, isAccountActive, isAdmin, isOrgMember } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { encryptSecret, isEncryptionConfigured } from "@/lib/crypto";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isUuid, sanitizeText } from "@/lib/validation";
import { logEvent } from "@/lib/logger";
import { requireSameOrigin } from "@/lib/security";

const PLATFORMS = ["facebook", "instagram"] as const;

function maskAccountId(id: string | null): string | null {
  if (!id) return null;
  return id.length > 8 ? `${id.slice(0, 4)}••••${id.slice(-3)}` : "••••";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = await getAuthContext(req, res);
  if (!ctx.user) return res.status(401).json({ error: "Authentification requise." });
  if (!isAccountActive(ctx.profile)) {
    return res.status(403).json({ error: "Compte suspendu ou banni." });
  }

  const orgId = isUuid(req.query.org_id)
    ? req.query.org_id
    : isUuid(req.body?.org_id)
      ? req.body.org_id
      : null;
  if (!orgId) return res.status(400).json({ error: "Organisation invalide." });

  const allowed = isAdmin(ctx.profile) || (await isOrgMember(ctx.user.id, orgId));
  if (!allowed) return res.status(403).json({ error: "Accès refusé." });

  const admin = adminClient();

  if (req.method === "GET") {
    const { data, error } = await admin
      .from("organization_social_accounts")
      .select("platform, account_id, account_name")
      .eq("org_id", orgId);
    if (error) return res.status(500).json({ error: "Lecture impossible." });

    const accounts = (data ?? []).map((a) => ({
      platform: a.platform,
      account_name: a.account_name,
      account_id: maskAccountId(a.account_id),
      connected: true,
    }));
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json({ accounts });
  }

  if (req.method === "POST") {
    if (!requireSameOrigin(req, res)) return;
    if (!enforceRateLimit(req, res, "social-connect", 20, 10 * 60_000)) return;
    if (!isEncryptionConfigured()) {
      logEvent("warn", "social.token_encryption_missing");
    }

    const platform = req.body?.platform;
    const accountId = sanitizeText(req.body?.account_id, 200);
    const accountName = sanitizeText(req.body?.account_name, 200);
    const accessToken = sanitizeText(req.body?.access_token, 4000);

    if (!PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: "Plateforme invalide." });
    }
    if (!accountId || !accessToken) {
      return res.status(400).json({ error: "Identifiant et jeton requis." });
    }
    if (!/^\d{5,25}$/.test(accountId)) {
      return res.status(400).json({
        error: "L’identifiant Meta doit être numérique (ID de page ou de compte Instagram).",
      });
    }

    const { error } = await admin.from("organization_social_accounts").upsert(
      {
        org_id: orgId,
        platform,
        account_id: accountId,
        account_name: accountName,
        access_token: encryptSecret(accessToken),
      },
      { onConflict: "org_id,platform" },
    );
    if (error) return res.status(400).json({ error: "Enregistrement impossible." });

    logEvent("info", "social.account_connected", {
      org_id: orgId,
      platform,
      by: ctx.user.id,
      encrypted: isEncryptionConfigured(),
    });
    return res.status(201).json({ ok: true });
  }

  if (req.method === "DELETE") {
    if (!requireSameOrigin(req, res)) return;
    if (!enforceRateLimit(req, res, "social-disconnect", 20, 10 * 60_000)) return;
    const platform =
      typeof req.query.platform === "string"
        ? req.query.platform
        : typeof req.body?.platform === "string"
          ? req.body.platform
          : null;
    if (!platform || !PLATFORMS.includes(platform as (typeof PLATFORMS)[number])) {
      return res.status(400).json({ error: "Plateforme invalide." });
    }
    const { error } = await admin
      .from("organization_social_accounts")
      .delete()
      .eq("org_id", orgId)
      .eq("platform", platform);
    if (error) return res.status(400).json({ error: "Suppression impossible." });
    logEvent("info", "social.account_disconnected", {
      org_id: orgId,
      platform,
      by: ctx.user.id,
    });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
