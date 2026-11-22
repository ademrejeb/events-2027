import { adminClient } from "@/lib/supabase/admin";

// Meta supports each Graph version for ~2 years. Pin a current version and
// allow override without a code change when the next one ships.
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v25.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type SocialPlatform = "facebook" | "instagram";
export type SocialResult = { platform: string; ok: boolean; id?: string; error?: string };

export function maskAccountId(id: string | null | undefined): string | null {
  if (!id) return null;
  return id.length > 8 ? `${id.slice(0, 4)}••••${id.slice(-3)}` : "••••";
}

export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return value === "facebook" || value === "instagram";
}

async function graphPost(path: string, params: Record<string, string>) {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    let message = String(json?.error?.message || `Erreur Graph API (${res.status})`);
    // Meta sometimes echoes the access token in validation errors. Never let a
    // token reach the UI, a run history row, or a log line.
    const secret = params.access_token;
    if (secret) {
      message = message.split(secret).join("[jeton masqué]");
      try {
        message = message.split(encodeURIComponent(secret)).join("[jeton masqué]");
      } catch {
        /* ignore encoding errors */
      }
    }
    throw new Error(message);
  }
  return json as { id?: string; post_id?: string };
}

export async function publishFacebook(
  accountId: string,
  token: string,
  caption: string,
  imageUrl: string | null,
  linkUrl: string | null,
): Promise<SocialResult> {
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

export async function publishInstagram(
  accountId: string,
  token: string,
  caption: string,
  imageUrl: string | null,
): Promise<SocialResult> {
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

/**
 * Stable, human-readable hashtag for an organization. Keeps Arabic or Latin
 * letters and digits, drops spaces/punctuation and title-cases Latin words:
 * "Croissant Rouge Tunisien" → "#CroissantRougeTunisien".
 */
export function hashtagForOrg(name: string): string {
  const words = name
    .normalize("NFKC")
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  const tag = words
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join("")
    .slice(0, 60);
  return `#${tag || "YedLkhirOrg"}`;
}

/** Append the organization + platform hashtags without duplicating them. */
export function crosspostCaption(caption: string, orgName: string): string {
  const base = caption.trim();
  const tags = [hashtagForOrg(orgName), "#YedLkhir"];
  const missing = tags.filter((tag) => !base.toLowerCase().includes(tag.toLowerCase()));
  const suffix = missing.length > 0 ? `\n\n${missing.join(" ")}` : "";
  return `${base}${suffix}`.slice(0, 2200);
}

async function graphGet(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${GRAPH}/${path}?${query}`, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    let message = String(json?.error?.message || `Erreur Graph API (${res.status})`);
    const secret = params.access_token;
    if (secret) message = message.split(secret).join("[jeton masqué]");
    throw new Error(message);
  }
  return json as Record<string, unknown>;
}

/**
 * Confirms the token can read the Page / IG account before we store it, and
 * derives the display name + public URL when Meta returns them.
 */
export async function verifySocialAccount(
  platform: SocialPlatform,
  accountId: string,
  token: string,
): Promise<{ name: string | null; publicUrl: string | null }> {
  if (platform === "facebook") {
    const data = await graphGet(accountId, {
      fields: "id,name,link",
      access_token: token,
    });
    return {
      name: typeof data.name === "string" ? data.name : null,
      publicUrl: typeof data.link === "string" ? data.link : null,
    };
  }
  const data = await graphGet(accountId, {
    fields: "id,username",
    access_token: token,
  });
  const username = typeof data.username === "string" ? data.username : null;
  return {
    name: username,
    publicUrl: username ? `https://www.instagram.com/${username}/` : null,
  };
}

export async function loadCentralAccounts(platforms: SocialPlatform[]) {
  const { data, error } = await adminClient()
    .from("platform_social_accounts")
    .select("platform, account_id, account_name, public_url, access_token")
    .in("platform", platforms);
  if (error) return [];
  return data ?? [];
}
