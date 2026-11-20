#!/usr/bin/env node
/**
 * Create (or promote) the platform administrator account.
 *
 * Usage:
 *   npm run create-admin
 *   npm run create-admin -- --email admin@example.tn --name "Amine"
 *   npm run create-admin -- --password "Chosen-Strong-Passw0rd!"
 *
 * Reads Supabase URL + service role key from .env.local (never printed).
 * The generated password is shown once: store it in a password manager.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  try {
    const raw = readFileSync(resolve(process.cwd(), file), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // Ignore: env may already be provided by the shell.
  }
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : undefined;
}

function strongPassword() {
  const base = randomBytes(24).toString("base64url");
  return `Yl!${base.slice(0, 20)}`;
}

loadEnv(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exit(1);
}

const email = (arg("email") ?? "admin@yedlkhir.tn").trim().toLowerCase();
const fullName = arg("name") ?? "Administrateur Yed Lkhir";
const password = arg("password") ?? strongPassword();
const generated = !arg("password");

if (password.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(target) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const match = data.users.find(
      (user) => (user.email ?? "").toLowerCase() === target,
    );
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  let userId;
  let created = false;

  const existing = await findUserByEmail(email);

  if (existing) {
    userId = existing.id;
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`updateUserById: ${error.message}`);
    console.log(`Existing auth user reused: ${email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw new Error(`createUser: ${error.message}`);
    userId = data.user?.id;
    created = true;
    if (!userId) throw new Error("createUser returned no user id");
    console.log(`Auth user created: ${email}`);
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      role: "individual",
      account_status: "active",
      organizer_status: "none",
      is_admin: true,
      suspended_at: null,
      status_reason: null,
    },
    { onConflict: "id" },
  );
  if (profileError) throw new Error(`profiles.upsert: ${profileError.message}`);

  console.log("Profile promoted to administrator.");
  console.log("");
  console.log("  URL      : /login");
  console.log(`  Email    : ${email}`);
  if (generated) {
    console.log(`  Password : ${password}`);
    console.log("");
    console.log("Store this password now - it will not be shown again.");
  } else {
    console.log("  Password : (the one you provided)");
  }
  console.log("");
  console.log(
    created
      ? "Done. Sign in, then open /admin."
      : "Done. Password reset and admin rights ensured. Open /admin.",
  );
}

main().catch((error) => {
  console.error("Failed:", error.message);
  process.exit(1);
});
