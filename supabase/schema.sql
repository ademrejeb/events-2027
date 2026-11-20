-- ============================================================
-- Tunisia Volunteer / Event Platform — Schema
-- Run this in the Supabase SQL editor (Dashboard > SQL > New query)
-- ============================================================

-- ---------- ENUMS ----------
create type public.user_role as enum ('individual', 'organization', 'government');
create type public.organization_type as enum ('club', 'ngo', 'government');
create type public.org_member_role as enum ('admin', 'member');
create type public.event_status as enum ('draft', 'published', 'cancelled', 'completed');

-- ---------- EXTENSIONS ----------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- One row per auth user, created automatically on signup.
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'individual',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'role', 'individual')::public.user_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ORGANIZATIONS
-- Clubs, NGOs and government bodies (e.g. Croissant Rouge, JCI).
-- ============================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  type public.organization_type not null,
  description text,
  city text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index organizations_owner_idx on public.organizations (owner_id);

-- Members of an organization.
create table public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role_in_org public.org_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (org_id, profile_id)
);

create index organization_members_profile_idx on public.organization_members (profile_id);

-- ============================================================
-- EVENT CATEGORIES
-- ============================================================
create table public.event_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

-- ============================================================
-- EVENTS
-- ============================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid not null references public.event_categories (id),
  title text not null,
  description text,
  location text,
  city text,
  start_at timestamptz not null,
  end_at timestamptz,
  max_volunteers int,
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now()
);

create index events_org_idx on public.events (org_id);
create index events_category_idx on public.events (category_id);
create index events_city_idx on public.events (city);
create index events_start_at_idx on public.events (start_at);

-- ============================================================
-- VOLUNTEERS (signups)
-- ============================================================
create table public.volunteers (
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create index volunteers_profile_idx on public.volunteers (profile_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.event_categories enable row level security;
alter table public.events enable row level security;
alter table public.volunteers enable row level security;

-- ---------- PROFILES ----------
-- Anyone signed in can read profiles (needed to show who joined an event).
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- A user can only update their own profile.
create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- ORGANIZATIONS ----------
-- Anyone (even anonymous) can browse organizations.
create policy "organizations are publicly readable"
  on public.organizations for select
  to anon, authenticated
  using (true);

-- Only users with a club / NGO / government role can create an organization.
create policy "organizers can create organizations"
  on public.organizations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('organization', 'government')
    )
  );

-- The owner can update their organization. (Admins / gov verification later.)
create policy "owners can update their organization"
  on public.organizations for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ---------- ORGANIZATION MEMBERS ----------
-- Members can be seen by anyone signed in.
create policy "members are readable by authenticated users"
  on public.organization_members for select
  to authenticated
  using (true);

-- A user can add themselves to an organization.
create policy "users can join organizations"
  on public.organization_members for insert
  to authenticated
  with check (auth.uid() = profile_id);

-- A user can leave an organization.
create policy "users can leave organizations"
  on public.organization_members for delete
  to authenticated
  using (auth.uid() = profile_id);

-- ---------- EVENT CATEGORIES ----------
create policy "categories are publicly readable"
  on public.event_categories for select
  to anon, authenticated
  using (true);

-- ---------- EVENTS ----------
-- Published events are public.
create policy "published events are publicly readable"
  on public.events for select
  to anon, authenticated
  using (status = 'published');

-- Organization members can see their own drafts too.
create policy "organization members see their own events"
  on public.events for select
  to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = events.org_id
        and m.profile_id = auth.uid()
    )
  );

-- Only members of an organization (or government) can create events.
create policy "organization members can create events"
  on public.events for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.organization_members m
      join public.profiles p on p.id = m.profile_id
      where m.org_id = events.org_id
        and m.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'government'
    )
  );

-- Organization members can update events of their organization.
create policy "organization members can update their events"
  on public.events for update
  to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = events.org_id
        and m.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'government'
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.org_id = events.org_id
        and m.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'government'
    )
  );

-- Organization members can delete their events.
create policy "organization members can delete their events"
  on public.events for delete
  to authenticated
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = events.org_id
        and m.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'government'
    )
  );

-- ---------- VOLUNTEERS ----------
-- Volunteer rosters are public (shows who joined — like RSVPs on an event page).
create policy "volunteer rosters are publicly readable"
  on public.volunteers for select
  to anon, authenticated
  using (true);

-- Anyone signed in can volunteer for an event.
create policy "users can volunteer for events"
  on public.volunteers for insert
  to authenticated
  with check (auth.uid() = profile_id);

-- A user can cancel their own participation.
create policy "users can cancel their participation"
  on public.volunteers for delete
  to authenticated
  using (auth.uid() = profile_id);

-- ============================================================
-- SEED DATA — event categories
-- ============================================================
insert into public.event_categories (name, slug) values
  ('Nettoyage / Cleaning', 'cleaning'),
  ('Ramadan', 'ramadan'),
  ('École / School', 'school'),
  ('Charité / Charity', 'charity'),
  ('Santé / Health', 'health'),
  ('Environnement / Environment', 'environment'),
  ('Autre / Other', 'other')
on conflict (slug) do nothing;
