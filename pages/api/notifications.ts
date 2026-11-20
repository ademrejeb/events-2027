import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/supabase/api";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { supabase, user } = await getAuthUser(req, res);

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.method === "GET") {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const unreadCount =
      data?.filter((n) => n.read_at === null).length ?? 0;

    return res.status(200).json({ notifications: data ?? [], unread_count: unreadCount });
  }

  if (req.method === "POST") {
    const { ids } = req.body ?? {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids)
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
