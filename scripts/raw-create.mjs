import fs from "node:fs";
import path from "node:path";

async function readEnvLocal() {
  const file = path.resolve(process.cwd(), ".env.local");
  const vars = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return vars;
}

async function main() {
  const vars = await readEnvLocal();
  const url = (vars.SUPABASE_URL ?? vars.NEXT_PUBLIC_SUPABASE_URL).replace(/\/$/, "");
  const key = vars.SUPABASE_SERVICE_ROLE_KEY;

  const r = await fetch(url + "/auth/v1/admin/users", {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "demo.benevole@gmail.com",
      password: "password123",
      email_confirm: true,
    }),
  });
  const body = await r.text();
  console.log("status:", r.status);
  console.log("body:", body);

  if (r.ok) {
    const d = JSON.parse(body);
    await fetch(url + "/auth/v1/admin/users/" + d.id, {
      method: "DELETE",
      headers: { apikey: key, Authorization: "Bearer " + key },
    });
  }
}

main().catch((e) => console.error("ERR", e.message));
