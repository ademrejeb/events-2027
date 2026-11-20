-- ============================================================
-- Yed Lkhir — Organizer verification, admin governance & security
-- Migration. Run AFTER schema.sql + schema-v3.sql + production.sql
-- and the feature migrations (event_participants, org_donations, ...).
--
-- Safe to re-run (idempotent guards).
-- ============================================================

-- ---------- ENUMS ----------
do $$ begin
  create type public.account_status as enum ('active', 'suspended', 'banned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organizer_status as enum (
    'none',      -- ordinary visitor/volunteer, never applied
    'pending',   -- application submitted, awaiting review
    'approved',  -- verified organizer
    'rejected',  -- application refused (may resubmit)
    'suspended', -- temporarily disabled
    'banned'     -- permanently disabled
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.application_status as enum (
    'pending', 'approved', 'rejected', 'withdrawn', 'suspended', 'banned'
  );
exception when duplicate_object then null; end $$;

-- Organizers can be individuals, associations, charities, clubs, NGOs, ...
alter type public.organization_type add value if not exists 'association';
alter type public.organization_type add value if not exists 'charity';
alter type public.organization_type add value if not exists 'individual';
alter type public.organization_type add value if not exists 'other';

-- ============================================================
-- 1. PROFILES — account status, organizer status, admin flag
-- ============================================================
alter table public.profiles
  add column if not exists account_status public.account_status not null default 'active',
  add column if not exists organizer_status public.organizer_status not null default 'none',
  add column if not exists is_admin boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists status_reason text;

create index if not exists profiles_admin_idx on public.profiles (is_admin) where is_admin;

-- Existing organization/government accounts are grandfathered as approved so
-- current organizers keep working. New accounts must go through review.
update public.profiles
   set organizer_status = 'approved'
 where role in ('organization', 'government')
   and organizer_status = 'none';

-- ============================================================
-- 2. ORGANIZER APPLICATIONS
-- ============================================================
create table if not exists public.organizer_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references public.profiles (id) on delete set null,
  name text not null,
  kind public.organization_type not null,
  contact_name text,
  email text not null,
  phone text,
  city text,
  description text,
  links text,
  verification_note text,
  status public.application_status not null default 'pending',
  review_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizer_applications_status_idx
  on public.organizer_applications (status, created_at desc);
create index if not exists organizer_applications_applicant_idx
  on public.organizer_applications (applicant_id);

-- One open application per email at a time (prevents duplicate spam).
create unique index if not exists organizer_applications_open_email_uidx
  on public.organizer_applications (lower(email))
  where status = 'pending';

alter table public.organizer_applications enable row level security;
-- No policies: only the service role (server APIs) can read/write.

-- ============================================================
-- 3. ORGANIZATIONS — lifecycle status + safe public columns
-- ============================================================
alter table public.organizations
  add column if not exists status public.application_status not null default 'pending',
  add column if not exists public_email text,
  add column if not exists public_phone text,
  add column if not exists website text,
  add column if not exists updated_at timestamptz not null default now();

-- Existing organizations are treated as approved (grandfathered).
update public.organizations set status = 'approved' where status = 'pending';

create index if not exists organizations_status_idx on public.organizations (status);

-- ============================================================
-- 4. ADMIN AUDIT LOG  (append-only, service-role only)
-- ============================================================
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_type, target_id);

alter table public.admin_audit_log enable row level security;
-- No policies: server-only.

-- ============================================================
-- 5. VOLUNTEER REGISTRATIONS (account-free) — harden + lifecycle
-- ============================================================
-- event_participants already exists from event_participants.sql.
alter table public.event_participants
  add column if not exists status text not null default 'submitted',
  add column if not exists email_hash text,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists ip_hash text;

create index if not exists event_participants_event_idx
  on public.event_participants (event_id, created_at desc);

-- Dedupe: same email + event cannot register twice (case-insensitive).
-- Uses a functional unique index so NULL emails are allowed (still unique per row is fine).
create unique index if not exists event_participants_event_email_uidx
  on public.event_participants (event_id, lower(email))
  where email is not null and email <> '';

-- Remove the over-permissive anon insert policy — inserts go through the
-- server API only (which validates + rate limits + applies business rules).
drop policy if exists "Anyone can submit participation" on public.event_participants;

-- ============================================================
-- 6. TIGHTEN RLS — no more public contact-data exposure
-- ============================================================
-- Profiles: a user can only read their own row. Organizer public identity now
-- lives on organizations (name/description/etc.). Admin reads via service role.
drop policy if exists "profiles are readable by authenticated users" on public.profiles;
drop policy if exists "profiles readable by self" on public.profiles;
create policy "profiles readable by self"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Volunteer rosters (registered-user signups) are no longer publicly readable.
drop policy if exists "volunteer rosters are publicly readable" on public.volunteers;

-- Organization members: visible to the members themselves only.
drop policy if exists "members are readable by authenticated users" on public.organization_members;
drop policy if exists "members readable by members" on public.organization_members;
create policy "members readable by members"
  on public.organization_members for select
  to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.organization_members m
      where m.org_id = organization_members.org_id
        and m.profile_id = auth.uid()
    )
  );

-- Organization self-signup no longer uses RLS insert (server API only).
drop policy if exists "organizers can create organizations" on public.organizations;

-- ============================================================
-- 7. VERIFICATION DOCUMENTS — private storage bucket
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('organizer-docs', 'organizer-docs', false, 10485760,
   '{image/jpeg,image/png,image/webp,application/pdf}')
on conflict (id) do nothing;

-- Organizers may upload their own documents (private bucket — no public read).
drop policy if exists "auth upload organizer-docs" on storage.objects;
create policy "auth upload organizer-docs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'organizer-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 8. REFRESH POSTGREST SCHEMA CACHE
-- ============================================================
notify pgrst, 'reload schema';

-- ============================================================
-- 9. BOOTSTRAP THE FIRST ADMINISTRATOR (run once, manually)
-- ============================================================
-- Admins can only be created server-side. After registering the intended
-- admin through the organizer form (or Supabase Auth), promote the account:
--
--   update public.profiles
--      set is_admin = true,
--          account_status = 'active',
--          organizer_status = 'approved',
--          role = 'organization'
--    where id = (select id from auth.users where email = 'admin@yedlkhir.tn');
--
-- Then sign in at /login and open /admin. Grant further admins from the
-- admin UI (Organisateurs → Nommer admin), which is audit-logged.

