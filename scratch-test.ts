import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const supabase = createClient<Database>("http://localhost", "key");

async function test() {
  const a = await supabase.from("profiles").select("role").eq("id", "x").single();
  const b = await supabase
    .from("events")
    .insert({ org_id: "o", title: "t", category_id: "c", start_at: "now" })
    .select("*")
    .single();
  return { a, b };
}

console.log(test);
