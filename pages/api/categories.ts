import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/lib/supabase/api";
import { internalError } from "@/lib/api-error";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { supabase } = await getAuthUser(req, res);

  const { data, error } = await supabase
    .from("event_categories")
    .select("id, name, slug")
    .order("name");

  if (error) {
    internalError(
      req,
      res,
      "Les catégories sont momentanément indisponibles.",
      error,
    );
    return;
  }

  return res.status(200).json({ categories: data });
}
