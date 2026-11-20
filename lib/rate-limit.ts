import type { NextApiRequest } from "next";

/**
 * Lightweight in-memory rate limiter (sliding window).
 *
 * LIMITATION: state is per-process. On multi-instance/serverless deployments
 * this only limits per instance — add infrastructure-level protection
 * (reverse proxy / CDN / WAF / a shared store such as Redis or Upstash) for
 * global enforcement. See docs/security notes in the delivery summary.
 */

type Hit = { count: number; resetAt: number };
const buckets = new Map<string, Hit>();

// Opportunistic cleanup so the Map cannot grow unbounded.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - existing.count, retryAfterSec: 0 };
}

/**
 * Resolve the client IP. Forwarded headers are only trusted when the app is
 * explicitly told it sits behind a trusted proxy (TRUST_PROXY=1); otherwise we
 * fall back to the socket address to avoid spoofed-header bypasses.
 */
export function clientIp(req: NextApiRequest): string {
  if (process.env.TRUST_PROXY === "1") {
    const xff = req.headers["x-forwarded-for"];
    const first = (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress ?? "unknown";
}

/**
 * Apply a rate limit and, when exceeded, write a 429 response with Retry-After.
 * Returns true when the request may proceed.
 */
export function enforceRateLimit(
  req: NextApiRequest,
  res: import("next").NextApiResponse,
  scope: string,
  limit: number,
  windowMs: number,
): boolean {
  const { ok, retryAfterSec } = rateLimit(
    `${scope}:${clientIp(req)}`,
    limit,
    windowMs,
  );
  if (!ok) {
    res.setHeader("Retry-After", String(retryAfterSec));
    res.status(429).json({
      error: "Trop de requêtes. Merci de réessayer dans quelques instants.",
    });
    return false;
  }
  return true;
}
