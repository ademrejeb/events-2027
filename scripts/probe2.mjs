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

  const emails = [
    "demo.benevole@gmail.com",
    "demo.croissantrouge@gmail.com",
    "demo.jci@gmail.com",
    "demo.mairie@gmail.com",
  ];

  // Try updating (existing user) vs creating, and probe the failing one after
  // a hard delete attempt.
  for (const email of emails) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: "password123",
      email_confirm: true,
    });
    if (error) {
      console.log(`FAIL ${email}: ${error.message}`);
    } else {
      console.log(`OK   ${email} (${created.user.id})`);
      await admin.auth.admin.deleteUser(created.user.id);
    }
  }
}

main();
