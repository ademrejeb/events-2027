import { createServerClient } from "@supabase/ssr";
import { serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Database } from "./types";
import { timedFetch } from "./timed-fetch";

export function createClient(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: { fetch: timedFetch },
      cookies: {
        getAll() {
          return Object.entries(req.cookies)
            .filter((entry): entry is [string, string] => entry[1] !== undefined)
            .map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet, headersToSet) {
          for (const [name, value] of Object.entries(headersToSet)) {
            res.setHeader(name, value);
          }
          for (const { name, value, options } of cookiesToSet) {
            res.appendHeader(
              "Set-Cookie",
              serialize(name, value, { path: "/", ...options }),
            );
          }
        },
      },
    },
  );
}
