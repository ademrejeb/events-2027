import type { NextApiRequest, NextApiResponse } from "next";
import { sanitizeHostedUrl } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { withApiLog } from "@/lib/api-log";

type Preview = { name: string | null; image: string | null; url: string };

const ALLOWED_HOSTS = ["facebook.com", "instagram.com"] as const;
const MAX_BODY = 512 * 1024;
const CACHE_MS = 12 * 60 * 60 * 1000;

const cache = new Map<string, { at: number; value: Preview }>();

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function metaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]) return decodeEntities(m[1]).trim();
  }
  return null;
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let out = "";
  let bytes = 0;
  while (bytes < MAX_BODY) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    out += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => undefined);
  return out;
}

async function resolve(url: string): Promise<Preview | null> {
  let current = url;

  // Follow only same-allowlist redirects, so an open redirect on the social
  // host can never make the server fetch an internal address.
  for (let hop = 0; hop < 3; hop += 1) {
    const res = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent": "facebookexternalhit/1.1 (+https://events-2027.onrender.com)",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      const next = new URL(location, current);
      const host = next.hostname.toLowerCase().replace(/^www\./, "");
      if (!ALLOWED_HOSTS.includes(host as (typeof ALLOWED_HOSTS)[number])) return null;
      current = next.toString();
      continue;
    }

    if (!res.ok) return null;
    const html = await readCapped(res);
    const name = metaContent(html, "og:title");
    const image = metaContent(html, "og:image");
    if (!name && !image) return null;
    return { name, image, url: current };
  }

  return null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const target = sanitizeHostedUrl(req.query.url, ALLOWED_HOSTS);
  if (!target) {
    return res.status(400).json({ error: "Lien social non supporté." });
  }

  const limit = rateLimit(`social-preview:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    return res.status(429).json({ error: "Trop de requêtes." });
  }

  const cached = cache.get(target);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.status(200).json({ preview: cached.value });
  }

  try {
    const preview = await resolve(target);
    if (!preview) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ preview: null });
    }
    cache.set(target, { at: Date.now(), value: preview });
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return res.status(200).json({ preview });
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ preview: null });
  }
}

export default withApiLog(handler);
