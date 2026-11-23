import type { NextApiRequest, NextApiResponse } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { internalError } from "@/lib/api-error";

/**
 * Canonical venue options for the event form.
 *
 * Cities come from the fixed governorate list (`lib/tunisia.ts`); this endpoint
 * only returns the precise venue spellings already used by published events,
 * de-duplicated case-insensitively, so organisers reuse one spelling.
 */
function unique(values: (string | null | undefined)[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const value = raw.trim().replace(/\s+/g, " ");
    if (value.length < 2 || value.length > 120) continue;
    const key = value.toLocaleLowerCase("fr");
    const current = seen.get(key);
    if (!current) {
      seen.set(key, value);
    } else if (
      current[0] === current[0].toLocaleLowerCase("fr") &&
      value[0] !== value[0].toLocaleLowerCase("fr")
    ) {
      // Prefer “Bizerte” over the same place stored as “bizerte”.
      seen.set(key, value);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "fr"));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!enforceRateLimit(req, res, "places", 60, 60 * 1000)) return;

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("events")
    .select("location")
    .eq("status", "published")
    .limit(1000);

  if (error) {
    internalError(
      req,
      res,
      "Les lieux sont momentanément indisponibles.",
      error,
    );
    return;
  }

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
  return res.status(200).json({
    locations: unique((data ?? []).map((event) => event.location)),
  });
}
