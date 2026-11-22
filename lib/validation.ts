/**
 * Minimal, dependency-free validation helpers for API boundaries.
 * Every untrusted field is type-, length-, and enum-checked explicitly.
 */

export type FieldError = { field: string; message: string };

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function trimmed(value: unknown, max = 5000): string | null {
  const s = asString(value);
  if (s === null) return null;
  return s.trim().slice(0, max);
}

export function isEmail(value: string): boolean {
  // Pragmatic email shape check (server-side); Supabase auth does stricter checks.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Tunisia-friendly phone: keep digits and a leading +; 6–15 digits. */
export function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "").slice(0, 20);
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 15;
}

export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/** Narrows a query param (which may be string | string[] | undefined) to string. */
export function queryId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

export function clampInt(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

export function validDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : value;
}

/**
 * Strip control characters and clamp length for free-text fields that will be
 * stored and later rendered. React escapes on render, but this keeps stored
 * data clean and bounded.
 */
export function sanitizeText(value: unknown, max = 5000): string | null {
  const s = asString(value);
  if (s === null) return null;
  return s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max);
}

/** Absolute http(s) URL, or a root-relative app path. */
export function sanitizeUrl(value: unknown, max = 2048): string | null {
  const s = sanitizeText(value, max)?.trim();
  if (!s) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const url = new URL(s);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Deduplicated, bounded list of image URLs from an untrusted payload. */
export function sanitizeUrlList(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const url = sanitizeUrl(item);
    if (url && !out.includes(url)) out.push(url);
    if (out.length >= max) break;
  }
  return out;
}

/** Accepts only the given hostnames (and their `www.` form). */
export function sanitizeHostedUrl(
  value: unknown,
  hosts: readonly string[],
  max = 2048,
): string | null {
  const url = sanitizeUrl(value, max);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!hosts.includes(host)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
