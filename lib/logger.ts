/**
 * Structured server-side logging for security-relevant events.
 * Never include secrets, tokens, passwords, or raw request bodies.
 */
type Level = "info" | "warn" | "error";

export function logEvent(
  level: Level,
  event: string,
  data: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Best-effort, non-reversible hash for dedupe (not for secrets). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Same-origin check for state-changing requests (CSRF defence-in-depth). */
export function sameOrigin(req: {
  headers: Record<string, string | string[] | undefined>;
}): boolean {
  const origin = req.headers["origin"];
  const host = req.headers["host"];
  if (!origin || !host) return false; // require Origin for cookie-auth mutations
  try {
    return new URL(Array.isArray(origin) ? origin[0] : origin).host ===
      (Array.isArray(host) ? host[0] : host);
  } catch {
    return false;
  }
}
