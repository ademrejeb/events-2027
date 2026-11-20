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

  const r = await fetch(url + "/auth/v1/admin/users?include_deleted=true&per_page=1000", {
    headers: { apikey: key, Authorization: "Bearer " + key },
  });
  const d = await r.json();
  console.log("total users (incl deleted):", d.total);
  for (const u of d.users ?? []) {
    console.log(
      `${u.email} | confirmed=${!!u.email_confirmed_at} | deleted_at=${u.deleted_at} | banned=${u.banned_until ?? "no"}`,
    );
  }
}

main().catch((e) => console.error("ERR", e.message));
