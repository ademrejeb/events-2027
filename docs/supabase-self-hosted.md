# Moving from hosted Supabase to your own server

The app only knows about Supabase through environment variables:

| variable | used by |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server |
| `SUPABASE_ANON_KEY` | server helpers / legacy clients |
| `SUPABASE_SERVICE_ROLE_KEY` | server APIs only (never sent to the browser) |
| `TOKEN_ENCRYPTION_KEY` | decrypts stored Facebook/Instagram tokens |

Nothing else is hard-coded: no project ref, no region, no callback URL baked
into the build. Moving therefore means **dump data → start a new Supabase →
restore data → change the four variables → redeploy**. The code stays the same.

> Keep `TOKEN_ENCRYPTION_KEY` identical between the two projects, otherwise
> previously connected social accounts can no longer be decrypted.

## 1. Apply the latest migration to the current (hosted) project first

The gallery/contact release adds columns that the new code reads. Run
`supabase/migrations/20261021001300_event_galleries_org_contacts.sql` in the
hosted project's SQL editor **before** deploying the new app build.

## 2. Self-host on a VPS

The supported route is the official Supabase Docker Compose stack (Postgres,
GoTrue auth, Storage, PostgREST, Kong, Studio).

1. VPS: Ubuntu 22.04/24.04, 4 GB RAM, 2 vCPU, Docker + Compose plugin.
2. Clone <https://github.com/supabase/supabase> and use `docker/`.
3. Copy `docker/.env.example` → `docker/.env` and set:
   - `POSTGRES_PASSWORD`, `JWT_SECRET`
   - `ANON_KEY`, `SERVICE_ROLE_KEY` (generate with the self-hosting key
     generator linked from the Supabase self-hosting guide)
   - `SITE_URL=https://your-app-domain`, `API_EXTERNAL_URL=https://api.your-domain`
   - `SMTP_*` (required for signup confirmation e-mails)
4. `docker compose pull && docker compose up -d`
5. Put Caddy or Nginx in front of Kong (`8000`) with TLS for
   `https://api.your-domain`.
6. Back up daily: `pg_dump` of the `postgres` database plus a copy of the
   storage volume (`docker/volumes/storage`).

Self-hosting has no automatic upgrades and no managed backups — schedule both.

## 3. Copy the database

Full fidelity (users' password hashes, all rows, storage metadata):

```bash
# From a machine with pg_dump 17 and network access to both databases.
pg_dump "$SOURCE_DB_URL" \
  --schema=public --schema=auth --schema=storage \
  --no-owner --no-privileges -Fc -f events-2027.dump

pg_restore --clean --if-exists --no-owner --no-privileges \
  -d "$TARGET_DB_URL" events-2027.dump
```

- Use the **direct** database URLs (hosted: Project Settings → Database →
  Connection string; self-hosted: `postgres://postgres:<password>@<vps>:5432/postgres`).
- Restore into a freshly initialized instance so Supabase's own schemas/roles
  already exist. Stop the app during the cutover to avoid split writes.
- If `auth` restore is not possible on your stack, fall back to recreating
  users through the Auth admin API and asking organizers to reset passwords.

## 4. Copy uploaded images

Storage files are not part of the SQL dump. Use the bundled script:

```bash
SOURCE_URL=https://<old-ref>.supabase.co \
SOURCE_SERVICE_KEY=<old-service-role-key> \
TARGET_URL=https://api.your-domain \
TARGET_SERVICE_KEY=<new-service-role-key> \
node scripts/copy-storage.mjs
```

It walks `event-images`, `org-logos` and `avatars`, downloads every object and
uploads it to the same path on the target (`upsert`). Bucket definitions and
public-read policies come from the migrations, so apply them to the new
database first.

## 5. Switch the app

Update the Render service (or VPS `.env`) and redeploy:

```
NEXT_PUBLIC_SUPABASE_URL=https://api.your-domain
SUPABASE_ANON_KEY=<new anon key>
SUPABASE_SERVICE_ROLE_KEY=<new service role key>
TOKEN_ENCRYPTION_KEY=<same value as before>
TRUST_PROXY=1
```

`TRUST_PROXY=1` only when the app is behind Caddy/Nginx/Render.

Verify after the switch:

- organizer login works;
- event create + image upload writes to the new bucket;
- an anonymous participation registers and the count increments;
- event detail shows before/after galleries;
- dashboard contact form saves and the public org page renders the contacts.

## 6. Roll back

Keep the old environment values until the new instance has served a full day.
Reverting is the same four variables plus a redeploy; no data migration back is
needed if the old project was left untouched.
