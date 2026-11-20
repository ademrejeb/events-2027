import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "./server";

export async function getAuthUser(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
