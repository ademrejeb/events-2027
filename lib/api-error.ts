import type { NextApiRequest, NextApiResponse } from "next";
import { logEvent } from "./logger";

/**
 * Reports a failed database/storage call without leaking why it failed.
 *
 * Supabase and PostgREST messages are internal: they can contain table and
 * column names, SQL fragments, or transport errors (`TypeError: fetch failed`).
 * The real cause is logged server-side; the browser only ever sees the fixed
 * localised `message`.
 */
export function internalError(
  req: NextApiRequest,
  res: NextApiResponse,
  message: string,
  cause?: unknown,
  status = 500,
): void {
  const detail =
    cause instanceof Error
      ? cause.message
      : typeof cause === "string"
        ? cause
        : ((cause as { message?: string; code?: string } | null | undefined)?.message ??
          (cause as { code?: string } | null | undefined)?.code ??
          "");
  logEvent(status >= 500 ? "error" : "warn", "api.internal", {
    route: (req.url ?? "").split("?")[0],
    status,
    cause: detail.slice(0, 300),
  });
  res.status(status).json({ error: message });
}
