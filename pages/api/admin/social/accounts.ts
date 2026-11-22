import type { NextApiRequest, NextApiResponse } from "next";
import { recordAudit, requireAdmin, type AuthContext } from "@/lib/authz";
import { adminClient } from "@/lib/supabase/admin";
import { encryptSecret, isEncryptionConfigured } from "@/lib/crypto";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/logger";
import {
  isSocialPlatform,
  maskAccountId,
  verifySocialAccount,
  type SocialPlatform,
} from "@/lib/social";
import { requireSameOrigin } from "@/lib/security";
import { sanitizeHostedUrl, sanitizeText } from "@/lib/validation";

const PLATFORM_HOSTS: Record<SocialPlatform, readonly string[]> = {
  facebook: ["facebook.com"],
  instagram: ["instagram.com"],
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;

  if (req.method === "GET") return listAccounts(res);
  if (req.method === "POST") return connectAccount(req, res, ctx);
  if (req.method === "DELETE") return disconnectAccount(req, res, ctx);
  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}

async function listAccounts(res: NextApiResponse) {
  const admin = adminClient();
  const [{ data: accounts, error }, { data: posts, error: postsError }] = await Promise.all([
    admin
      .from("platform_social_accounts")
      .select("platform, account_id, account_name, public_url, updated_at")
      .order("platform"),
    admin
      .from("social_posts")
      .select(
        "id, scope, caption, image_url, link_url, platforms, results, source_org_id, created_at",
      )
      .in("scope", ["platform", "crosspost"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (error || postsError) {
    return res.status(500).json({ error: "Impossible de charger les comptes centraux." });
  }

  const orgIds = [
    ...new Set((posts ?? []).map((post) => post.source_org_id).filter(Boolean)),
  ] as string[];
  const names = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: orgs } = await admin.from("organizations").select("id, name").in("id", orgIds);
    for (const org of orgs ?? []) names.set(org.id, org.name);
  }

  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({
    accounts: (accounts ?? []).map((account) => ({
      platform: account.platform,
      account_id: maskAccountId(account.account_id),
      account_name: account.account_name,
      public_url: account.public_url,
      updated_at: account.updated_at,
    })),
    posts: (posts ?? []).map((post) => ({
      ...post,
      source_org_name: post.source_org_id ? names.get(post.source_org_id) ?? null : null,
    })),
  });
}

async function connectAccount(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: AuthContext,
) {
  if (!requireSameOrigin(req, res)) return;
  if (!enforceRateLimit(req, res, "admin-social-connect", 20, 10 * 60_000)) return;

  if (!isEncryptionConfigured()) {
    logEvent("warn", "social.token_encryption_missing", { scope: "platform" });
  }

  const platform = req.body?.platform;
  if (!isSocialPlatform(platform)) {
    return res.status(400).json({ error: "Plateforme invalide." });
  }
  const accountId = sanitizeText(req.body?.account_id, 200)?.trim() || null;
  const accountName = sanitizeText(req.body?.account_name, 200)?.trim() || null;
  const publicUrl = sanitizeHostedUrl(req.body?.public_url, PLATFORM_HOSTS[platform]);
  const accessToken = sanitizeText(req.body?.access_token, 4000)?.trim() || null;

  if (!accountId || !accessToken) {
    return res.status(400).json({ error: "Identifiant et jeton requis." });
  }
  if (!/^\d{5,25}$/.test(accountId)) {
    return res.status(400).json({
      error: "L’identifiant Meta doit être numérique (ID de page ou de compte Instagram).",
    });
  }
  if (req.body?.public_url && !publicUrl) {
    return res.status(400).json({ error: "URL de page invalide." });
  }

  let verifiedName = accountName;
  let verifiedUrl = publicUrl;
  try {
    const verified = await verifySocialAccount(platform, accountId, accessToken);
    verifiedName = accountName ?? verified.name;
    verifiedUrl = publicUrl ?? verified.publicUrl;
  } catch (error) {
    return res.status(400).json({
      error: `Meta a refusé ce jeton : ${(error as Error).message}`,
    });
  }

  const now = new Date().toISOString();
  const admin = adminClient();
  const { error } = await admin.from("platform_social_accounts").upsert(
    {
      platform,
      account_id: accountId,
      account_name: verifiedName,
      public_url: verifiedUrl,
      access_token: encryptSecret(accessToken),
      updated_at: now,
    },
    { onConflict: "platform" },
  );
  if (error) return res.status(400).json({ error: "Enregistrement impossible." });

  await recordAudit({
    actorId: ctx.user!.id,
    actorEmail: ctx.user?.email,
    action: "social.account.connect",
    targetType: "platform_social_account",
    targetId: platform,
    metadata: { platform, account_name: accountName },
  });
  logEvent("info", "social.platform_connected", {
    platform,
    by: ctx.user!.id,
    encrypted: isEncryptionConfigured(),
  });
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(201).json({ ok: true });
}

async function disconnectAccount(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: AuthContext,
) {
  if (!requireSameOrigin(req, res)) return;
  if (!enforceRateLimit(req, res, "admin-social-disconnect", 20, 10 * 60_000)) return;

  const platform =
    typeof req.query.platform === "string"
      ? req.query.platform
      : typeof req.body?.platform === "string"
        ? req.body.platform
        : null;
  if (!isSocialPlatform(platform)) {
    return res.status(400).json({ error: "Plateforme invalide." });
  }

  const { error } = await adminClient()
    .from("platform_social_accounts")
    .delete()
    .eq("platform", platform);
  if (error) return res.status(400).json({ error: "Suppression impossible." });

  await recordAudit({
    actorId: ctx.user!.id,
    actorEmail: ctx.user?.email,
    action: "social.account.disconnect",
    targetType: "platform_social_account",
    targetId: platform,
    metadata: { platform },
  });
  logEvent("info", "social.platform_disconnected", { platform, by: ctx.user!.id });
  return res.status(200).json({ ok: true });
}
