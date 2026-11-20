import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

async function readEnvLocal() {
  const file = path.resolve(process.cwd(), ".env.local");
  const vars = {};
  if (!fs.existsSync(file)) return vars;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return vars;
}

async function main() {
  const env = await readEnvLocal();
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, key, { auth: { autoRefreshToken: false } });

  console.log("-- auth users (email -> confirmed) --");
  const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) console.log("listUsers error:", listErr.message);
  for (const u of listed?.users ?? []) {
    console.log(`${u.email}  confirmed=${!!u.email_confirmed_at}`);
  }

  console.log("-- public.profiles rows --");
  const { data: profiles, error: profErr } = await admin.from("profiles").select("id, full_name, role");
  if (profErr) console.log("profiles error:", profErr.message);
  console.log(JSON.stringify(profiles ?? [], null, 1));

  console.log("-- try creating a throwaway user (no metadata) --");
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: "probe@example.com",
    password: "password123",
    email_confirm: true,
  });
  if (createErr) console.log("create error:", createErr.message);
  else {
    console.log("created ok:", created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
  }
}

main();
