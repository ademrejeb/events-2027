import type { NextApiRequest, NextApiResponse } from "next";
import { adminClient } from "@/lib/supabase/admin";
import { withApiLog } from "@/lib/api-log";

/**
 * Public links to the platform-owned Facebook Page / Instagram account.
 * Only the URLs are exposed; tokens never leave the service role.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { data, error } = await adminClient()
    .from("platform_social_accounts")
    .select("platform, public_url")
    .not("public_url", "is", null);

  if (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ facebook: null, instagram: null });
  }

  const links = { facebook: null as string | null, instagram: null as string | null };
  for (const row of data ?? []) {
    if (row.platform === "facebook") links.facebook = row.public_url;
    if (row.platform === "instagram") links.instagram = row.public_url;
  }

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json(links);
}

export default withApiLog(handler);
