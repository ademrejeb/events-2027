// Creates (or confirms) the demo users through the Supabase Admin API and
// re-wires the seed data (org ownership / membership / volunteer rows) to the
// real user IDs.
//
// Direct inserts into auth.users often fail on newer Supabase projects, so this
// uses the official Admin API instead — reliable across versions.
//
// Usage:
//   1. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local
//      (Dashboard -> Settings -> API -> service_role key)
//   2. node scripts/create-demo-users.mjs
//
// All demo accounts share the password: password123

const SEED = [
  {
    seedId: "aaaaaaaa-0000-0000-0000-000000000001",
    email: "demo.croissantrouge@gmail.com",
    password: "password123",
    user_metadata: { full_name: "Croissant Rouge Tunisien", role: "organization" },
    ownsOrg: "bbbbbbbb-0000-0000-0000-000000000001",
  },
  {
    seedId: "aaaaaaaa-0000-0000-0000-000000000002",
    email: "demo.jci@gmail.com",
    password: "password123",
    user_metadata: { full_name: "JCI Tunis", role: "organization" },
    ownsOrg: "bbbbbbbb-0000-0000-0000-000000000002",
  },
  {
    seedId: "aaaaaaaa-0000-0000-0000-000000000003",
    email: "demo.mairie@gmail.com",
    password: "password123",
    user_metadata: { full_name: "Municipalité de Tunis", role: "government" },
    ownsOrg: "bbbbbbbb-0000-0000-0000-000000000003",
  },
  {
    seedId: "aaaaaaaa-0000-0000-0000-000000000004",
    email: "demo.benevole@gmail.com",
    password: "password123",
    user_metadata: { full_name: "Sami Ben Ali", role: "individual" },
  },
];

const VOLUNTEER_ROWS = [
  {
    eventId: "cccccccc-0000-0000-0000-000000000001",
    seedProfileId: "aaaaaaaa-0000-0000-0000-000000000004",
  },
];

async function readEnvLocal() {
  const fs = await import("node:fs");
  const path = await import("node:path");
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
  const url =
    env.SUPABASE_URL ??
    env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local. Add them and retry.",
    );
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { autoRefreshToken: false } });

  // Build email -> real user id map.
  const emailToId = new Map();
  const { data: listed } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  for (const u of listed?.users ?? []) emailToId.set(u.email, u.id);

  for (const s of SEED) {
    const foundId = emailToId.get(s.email);
    if (foundId) {
      const { error } = await admin.auth.admin.updateUserById(foundId, {
        password: s.password,
        email_confirm: true,
        user_metadata: s.user_metadata,
      });
      if (error) {
        console.error(`x ${s.email}: update failed - ${error.message}`);
        continue;
      }
      emailToId.set(s.email, foundId);
      console.log(`ok ${s.email}: confirmed`);
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: s.email,
        password: s.password,
        email_confirm: true,
        user_metadata: s.user_metadata,
      });
      if (error) {
        console.error(`x ${s.email}: create failed - ${error.message}`);
        continue;
      }
      emailToId.set(s.email, data.user.id);
      console.log(`ok ${s.email}: created + confirmed`);
    }
  }

  // Re-wire seed rows so the demo accounts actually own/admin their org and the
  // sample volunteer row points at the real user.
  for (const s of SEED) {
    const realId = emailToId.get(s.email);
    if (!realId || !s.ownsOrg) continue;

    const { error: ownerError } = await admin
      .from("organizations")
      .update({ owner_id: realId })
      .eq("id", s.ownsOrg);
    if (ownerError) console.error(`x org owner ${s.email}: ${ownerError.message}`);

    const { error: memberError } = await admin
      .from("organization_members")
      .upsert(
        { org_id: s.ownsOrg, profile_id: realId, role_in_org: "admin" },
        { onConflict: "org_id,profile_id" },
      );
    if (memberError)
      console.error(`x org member ${s.email}: ${memberError.message}`);
    else console.log(`ok ${s.email}: admin of org`);
  }

  for (const v of VOLUNTEER_ROWS) {
    const realId = emailToId.get(
      SEED.find((s) => s.seedId === v.seedProfileId)?.email ?? "",
    );
    if (!realId) continue;
    const { error } = await admin
      .from("volunteers")
      .upsert(
        { event_id: v.eventId, profile_id: realId },
        { onConflict: "event_id,profile_id" },
      );
    if (error) console.error(`x volunteer row: ${error.message}`);
    else console.log(`ok volunteer row for event ${v.eventId}`);
  }

  console.log("Done. Log in with password123 on any demo account.");
}

main();
