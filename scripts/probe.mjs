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
  const admin = createClient(env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false },
  });

  // Case A: metadata with role organization + full_name (like demo accounts)
  const a = await admin.auth.admin.createUser({
    email: "probe-a@example.com",
    password: "password123",
    email_confirm: true,
    user_metadata: { full_name: "Probe A", role: "organization" },
  });
  console.log("A (metadata org):", a.error ? "FAIL " + a.error.message : "OK " + a.data.user.id);
  if (a.data?.user?.id) await admin.auth.admin.deleteUser(a.data.user.id);

  // Case B: same email as a demo account (no metadata)
  const b = await admin.auth.admin.createUser({
    email: "demo.benevole@gmail.com",
    password: "password123",
    email_confirm: true,
  });
  console.log("B (demo benevole, no metadata):", b.error ? "FAIL " + b.error.message : "OK " + b.data.user.id);
  if (b.data?.user?.id) await admin.auth.admin.deleteUser(b.data.user.id);

  // Case C: metadata with role individual + full_name
  const c = await admin.auth.admin.createUser({
    email: "probe-c@example.com",
    password: "password123",
    email_confirm: true,
    user_metadata: { full_name: "Probe C", role: "individual" },
  });
  console.log("C (metadata individual):", c.error ? "FAIL " + c.error.message : "OK " + c.data.user.id);
  if (c.data?.user?.id) await admin.auth.admin.deleteUser(c.data.user.id);
}

main();
