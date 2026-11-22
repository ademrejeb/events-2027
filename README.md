# Tunisian Events & Volunteering Platform

Help organize and join community events in Tunisia — cleaning campaigns, Ramadan
drives, school events, charity work. Individuals volunteer, clubs/NGOs and
government bodies organize.

Built with **Next.js (Pages Router) + Supabase** (PostgreSQL, Auth, RLS).

## Local Supabase (free)

This repo now includes `supabase/config.toml` and ordered migrations, so the
whole stack runs locally. Requirements: Docker Desktop (or a Docker-compatible
engine) and Node.js.

```bash
npx supabase start
npm run db:local-env
npm run dev
```

`supabase start` applies every migration from `supabase/migrations/` and then
runs both `seed.sql` (demo accounts) and `seed-large.sql` (synthetic load-test
data). `npm run db:local-env` writes the local API URL and keys into
`.env.local` and backs up the previous file. The local Studio is at
`http://127.0.0.1:54323`.

Useful commands:

```bash
npm run db:reset   # wipe + replay migrations + both seeds
npm run db:stop    # stop containers, keep data
npx supabase status -o env
```

The large seed creates 240 extra users, 60 organizations, 900 events, ~14k
guest registrations, ~10k volunteer signups, plus feedback, applications,
notifications, badges and audit rows. It is safe to re-run and only deletes
rows whose e-mail starts with `loadtest.`.

## Setup

> Moving the project to your own Supabase instance? See
> [`docs/supabase-self-hosted.md`](docs/supabase-self-hosted.md) — database,
> auth users, storage files, env swap and rollback.

### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) → **New project**.
2. Open the project → **SQL Editor** → paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. Then run [`supabase/seed.sql`](supabase/seed.sql) to add demo
   organizations, events and categories.
4. Run [`supabase/production.sql`](supabase/production.sql) for indexes and
   the race-safe capacity trigger (recommended).
5. **Project Settings → API** → copy the **Project URL** and the **publishable/anon key**.

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in the Supabase values in `.env.local`. For demo accounts, also add your
**service_role key** (Dashboard → Settings → API) as `SUPABASE_SERVICE_ROLE_KEY`.

`SUPABASE_ANON_KEY` must be the publishable/anon key, not a `sb_secret_...`
key. All Supabase access from the browser now goes through Next.js API routes,
so no Supabase key is shipped to the client.

### 3. Create the demo accounts

Direct inserts into `auth.users` (in `seed.sql`) often fail on newer Supabase
projects, so demo logins are created through the official Admin API instead:

```bash
node scripts/create-demo-users.mjs
```

### 4. Run

```bash
npm install
npm run dev
```

## Demo accounts (password `password123`)

| Email                        | Type         |
| ---------------------------- | ------------ |
| demo.benevole@gmail.com      | individual   |
| demo.croissantrouge@gmail.com | organization |
| demo.jci@gmail.com           | organization |
| demo.mairie@gmail.com        | government   |
| admin@yedlkhir.tn            | admin (local seed only) |

> If you created a **new** account through the signup page and can't log in,
> it's because Supabase email confirmation is ON by default. Open the account's
> confirmation link in your inbox, or disable it in Dashboard → Authentication →
> Sign In / Providers → Email → uncheck "Confirm email".

## Pages

| Route                 | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| `/`                   | Home: event feed, category filters, pagination |
| `/events/[id]`        | Event detail: join/leave, volunteer list       |
| `/events/new`         | Create an event (org member / government)      |
| `/organizations/new`  | Create an organization (club/ngo/government)   |
| `/login`              | Sign in                                        |
| `/signup`             | Sign up with role selection                    |

## API Routes

| Method | Route                              | Description                                   | Access            |
| ------ | ---------------------------------- | --------------------------------------------- | ----------------- |
| POST   | `/api/auth/signup`                 | Create account (`role`: individual / organization / government) | public    |
| POST   | `/api/auth/login`                  | Sign in                                        | public            |
| POST   | `/api/auth/logout`                 | Sign out                                       | authenticated     |
| GET    | `/api/me`                          | Current user + profile                         | authenticated     |
| GET    | `/api/events`                      | List published events (pagination: `after` cursor, `limit`; filters: `category`, `city`) | public        |
| POST   | `/api/events`                      | Create an event                                | org member / gov  |
| GET    | `/api/events/[id]`                 | Event detail + volunteer count, roster, joined | public*           |
| PATCH  | `/api/events/[id]`                 | Update event                                   | org member / gov  |
| DELETE | `/api/events/[id]`                 | Delete event                                   | org member / gov  |
| POST   | `/api/events/[id]/volunteer`       | Volunteer for an event (capacity-safe)         | authenticated     |
| DELETE | `/api/events/[id]/volunteer`       | Cancel volunteering                            | authenticated     |
| GET    | `/api/organizations`               | List organizations                             | public            |
| POST   | `/api/organizations`               | Create an organization (club/ngo/government)   | org or gov role   |
| GET    | `/api/organizations/mine`          | Organizations I'm a member of (org picker)     | authenticated     |
| GET    | `/api/categories`                  | Event categories (for create-event form)       | public            |

\* Drafts are only visible to members of the owning organization.

## Signup example

```js
const res = await fetch("/api/auth/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "club@example.com",
    password: "secret123",
    fullName: "Tunisian Red Crescent",
    phone: "+21600000000",
    role: "organization", // or "individual" | "government"
  }),
});
```

## Flow

1. **Individual** signs up → browses published events → volunteers via
   `POST /api/events/[id]/volunteer`.
2. **Club/NGO or government** signs up with `role: "organization"` (or
   `"government"`) → creates an organization via `POST /api/organizations` →
   creates events under it → members of the org can update/delete them.
3. Row Level Security enforces all of this in the database — the API routes just
   pass through.

## Generate types after schema changes

Once connected, regenerate the TypeScript types to match your schema:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public > lib/supabase/types.ts
```

## Réseaux sociaux centraux

L’administration (`/admin/social`) connecte **une page Facebook** et **un compte
Instagram Business** appartenant à la plateforme :

- **Facebook** : ID de la page + jeton de page avec `pages_manage_posts` et
  `pages_read_engagement`.
- **Instagram** : ID du compte Business + jeton avec `instagram_content_publish`
  et `instagram_basic`. Une image publique HTTPS est obligatoire.

Chaque connexion est vérifiée auprès de Meta avant d’être enregistrée. Le jeton
est chiffré (AES-256-GCM), n’est jamais renvoyé au navigateur et la table
`platform_social_accounts` n’a aucune policy RLS (service role uniquement).

Quand une organisation publie depuis son tableau de bord :

1. la publication part sur ses propres pages ;
2. elle est recopiée sur les pages centrales avec **`#Organisation`** et
   **`#YedLkhir`** (l’organisation est identifiée par un hashtag stable dérivé
   de son nom) ;
3. le résultat de chaque réseau est conservé et visible dans l’historique
   admin.

Le compositeur central permet aussi de publier directement (annonce, appel à
bénévoles) avec image et lien. Toutes les actions sont journalisées
(`social.account.connect`, `social.account.disconnect`, `social.publish`,
`social.crosspost`).

**Sécurité admin** : pages protégées côté serveur, API admin uniquement,
contrôle d’origine (CSRF) sur les mutations, limitation de débit, IDs Meta
numériques validés, erreurs Graph nettoyées pour ne jamais exposer un jeton.

La version Graph est `META_GRAPH_VERSION` (défaut `v25.0`). Meta supporte
chaque version environ deux ans ; mettez-la à jour dans l’environnement.

## Deployment

Deploy the Next.js app on [Vercel](https://vercel.com) and add the same two env
vars to the project settings.
