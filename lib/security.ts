import type { NextApiRequest, NextApiResponse } from "next";

/**
 * CSRF defence for cookie-authenticated mutations.
 *
 * Browsers send an Origin header on cross-site POST/PATCH/DELETE requests. If
 * it does not match the request host (or a configured app URL), reject before
 * the session is even read. Non-browser clients (no Origin) are unaffected;
 * they cannot ride a victim's cookies.
 */
export function requireSameOrigin(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;

  const allowed = new Set<string>();
  if (req.headers.host) allowed.add(req.headers.host.toLowerCase());
  for (const envUrl of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    if (!envUrl) continue;
    try {
      allowed.add(new URL(envUrl).host.toLowerCase());
    } catch {
      /* ignore malformed env values */
    }
  }

  try {
    const originHost = new URL(origin).host.toLowerCase();
    if (allowed.has(originHost)) return true;
  } catch {
    /* fall through to the rejection below */
  }

  res.status(403).json({ error: "Origine de la requête refusée." });
  return false;
}
