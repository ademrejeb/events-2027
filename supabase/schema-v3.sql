-- ============================================================
-- Phase 3 — Schema migration
-- Run AFTER schema.sql + seed.sql + production.sql
-- Adds: images, profiles v2, search, maps, stats, notifications
-- ============================================================

-- ---------- EXTENSIONS ----------
create extension if not exists postgis;
create extension if not exists pg_trgm;

-- ---------- NEW ENUMS ----------
create type public.notification_type as enum (
  'event_joined',
  'event_created',
  'volunteer_joined',
  'org_invite'
);

-- ============================================================
-- 1. IMAGE UPLOADS — columns + storage
-- ============================================================

-- Events: cover photo
alter table public.events
  add column if not exists image_url text;

-- Organizations: logo
alter table public.organizations
  add column if not exists logo_url text;

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-images', 'event-images', true, 5242880, '{image/jpeg,image/png,image/webp,image/gif}'),
  ('org-logos', 'org-logos', true, 2097152, '{image/jpeg,image/png,image/webp}'),
  ('avatars', 'avatars', true, 2097152, '{image/jpeg,image/png,image/webp}')
on conflict (id) do nothing;

-- Storage RLS policies
-- Anyone can read public buckets.
create policy "public read event-images"
  on storage.objects for select
  using (bucket_id = 'event-images');

create policy "public read org-logos"
  on storage.objects for select
  using (bucket_id = 'org-logos');

create policy "public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder.
create policy "auth upload event-images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "auth upload org-logos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "auth upload avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owners can update/delete their own files.
create policy "owner update event-images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'event-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner delete event-images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner update org-logos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'org-logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner delete org-logos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'org-logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner update avatars"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner delete avatars"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 2. USER PROFILES v2 — bio + badges
-- ============================================================

alter table public.profiles
  add column if not exists bio text;

-- Badges: achievements for volunteers
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text not null default '🏅',
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_badges (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (profile_id, badge_id)
);

alter table public.badges enable row level security;
alter table public.profile_badges enable row level security;

create policy "badges are publicly readable"
  on public.badges for select
  to anon, authenticated
  using (true);

create policy "profile badges are readable by anyone"
  on public.profile_badges for select
  to anon, authenticated
  using (true);

-- Seed core badges
insert into public.badges (name, slug, icon, description) values
  ('Première Mission', 'first-event', '🌟', 'A participé à sa première action solidaire'),
  ('Bénévole Actif', 'active-volunteer', '💪', 'A participé à 5 événements ou plus'),
  ('Héros du Bénévolat', 'volunteer-hero', '🦸', 'A participé à 20 événements ou plus'),
  ('Fondateur', 'founder', '🏛️', 'A créé une organisation'),
  ('Mappeur', 'mapper', '🗺️', 'A ajouté un lieu géolocalisé'),
  ('Explorateur', 'explorer', '🔍', 'A utilisé la recherche avancée')
on conflict (slug) do nothing;

-- ============================================================
-- 3. FULL-TEXT SEARCH — search vector + trigger + index
-- ============================================================

-- Add tsvector column
alter table public.events
  add column if not exists search_vector tsvector;

-- Populate from title + description + city
create or replace function public.events_search_vector_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(new.description, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(new.city, '')), 'C');
  return new;
end;
$$;

create trigger events_search_vector_trigger
  before insert or update of title, description, city
  on public.events
  for each row execute function public.events_search_vector_update();

-- GIN index for fast tsvector lookups
create index if not exists events_search_vector_idx
  on public.events using gin (search_vector);

-- Backfill existing rows
update public.events set search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A')
  || setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  || setweight(to_tsvector('simple', coalesce(city, '')), 'C');

-- ============================================================
-- 4. INTERACTIVE MAPS — PostGIS columns + spatial index + RPC
-- ============================================================

-- Add lat/lng + PostGIS geometry
alter table public.events
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists geom geometry(Point, 4326);

-- Auto-populate geom from lat/lng
create or replace function public.events_geom_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.lat is not null and new.lng is not null then
    new.geom := st_point(new.lng, new.lat);
  else
    new.geom := null;
  end if;
  return new;
end;
$$;

create trigger events_geom_trigger
  before insert or update of lat, lng
  on public.events
  for each row execute function public.events_geom_update();

-- Spatial index (GiST)
create index if not exists events_geom_idx
  on public.events using gist (geom);

-- RPC: nearby events within a radius (km)
create or replace function public.nearby_events(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 25.0,
  p_limit int default 20
)
returns table (
  id uuid,
  title text,
  description text,
  city text,
  location text,
  start_at timestamptz,
  image_url text,
  distance_km double precision
)
language sql stable
security definer set search_path = public
as $$
  select
    e.id,
    e.title,
    e.description,
    e.city,
    e.location,
    e.start_at,
    e.image_url,
    round((st_distance(
      st_point(e.lng, e.lat)::geography,
      st_point(p_lng, p_lat)::geography
    ) / 1000.0)::numeric, 1)::double precision as distance_km
  from public.events e
  where e.status = 'published'
    and e.lat is not null
    and e.lng is not null
    and st_dwithin(
      st_point(e.lng, e.lat)::geography,
      st_point(p_lng, p_lat)::geography,
      p_radius_km * 1000
    )
  order by st_distance(
    st_point(e.lng, e.lat)::geography,
    st_point(p_lng, p_lat)::geography
  )
  limit p_limit;
$$;

-- ============================================================
-- 5. STATS — materialized views
-- ============================================================

-- Platform-wide stats (refresh periodically or on-demand)
create materialized view if not exists public.platform_stats as
select
  (select count(*) from public.events where status = 'published') as total_events,
  (select count(*) from public.volunteers) as total_volunteers,
  (select count(*) from public.organizations) as total_organizations,
  (select count(distinct city) from public.events where city is not null) as total_cities,
  (select count(*) from public.profiles) as total_users;

-- Per-category event counts
create materialized view if not exists public.category_stats as
select
  c.id as category_id,
  c.name as category_name,
  c.slug as category_slug,
  count(e.id) as event_count,
  coalesce(sum(v.count), 0) as total_volunteers
from public.event_categories c
left join public.events e on e.category_id = c.id and e.status = 'published'
left join (
  select event_id, count(*) as count
  from public.volunteers
  group by event_id
) v on v.event_id = e.id
group by c.id, c.name, c.slug;

-- Volunteer growth by month
create materialized view if not exists public.volunteer_growth as
select
  date_trunc('month', v.joined_at) as month,
  count(*) as volunteer_signups,
  count(distinct v.profile_id) as unique_volunteers,
  count(distinct v.event_id) as events_acted
from public.volunteers v
group by date_trunc('month', v.joined_at)
order by month;

-- Top cities by event count
create materialized view if not exists public.city_stats as
select
  e.city,
  count(*) as event_count,
  coalesce(sum(v.count), 0) as total_volunteers
from public.events e
left join (
  select event_id, count(*) as count
  from public.volunteers
  group by event_id
) v on v.event_id = e.id
where e.city is not null and e.status = 'published'
group by e.city
order by event_count desc;

-- Helper: refresh all materialized views
create or replace function public.refresh_stats()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  refresh materialized view concurrently public.platform_stats;
  refresh materialized view concurrently public.category_stats;
  refresh materialized view concurrently public.volunteer_growth;
  refresh materialized view concurrently public.city_stats;
end;
$$;

-- ============================================================
-- 6. NOTIFICATIONS — table + RLS + realtime
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at)
  where read_at is null;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Users can only see their own notifications.
create policy "users see their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

-- System inserts notifications for users (via trigger/functions).
create policy "system can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (true);

-- Users can mark their own as read.
create policy "users can update their notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own.
create policy "users can delete their notifications"
  on public.notifications for delete
  to authenticated
  using (auth.uid() = user_id);

-- Enable realtime on notifications table
alter publication supabase_realtime add table public.notifications;

-- Trigger: notify org admins when someone volunteers for their event
create or replace function public.notify_volunteer_joined()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_org_owner uuid;
  v_event_title text;
  v_volunteer_name text;
begin
  select e.org_id, e.title into v_org_owner, v_event_title
  from public.events e where e.id = new.event_id;

  select p.full_name into v_volunteer_name
  from public.profiles p where p.id = new.profile_id;

  -- Notify each admin of the org (owner included)
  insert into public.notifications (user_id, type, title, body, link)
  select
    m.profile_id,
    'volunteer_joined',
    'Nouveau bénévole',
    coalesce(v_volunteer_name, 'Un bénévole') || ' s''est inscrit à « ' || v_event_title || ' »',
    '/events/' || new.event_id
  from public.organization_members m
  where m.org_id = v_org_owner
    and m.role_in_org = 'admin'
    and m.profile_id != new.profile_id;

  return new;
end;
$$;

create trigger on_volunteer_joined
  after insert on public.volunteers
  for each row execute function public.notify_volunteer_joined();

-- Trigger: notify the user when an event they volunteered for is created (if they're in the org)
-- Actually let's do: when an event is published, notify all org members
create or replace function public.notify_event_published()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'published' and (old is null or old.status != 'published') then
    insert into public.notifications (user_id, type, title, body, link)
    select
      m.profile_id,
      'event_created',
      'Nouvel événement',
      '« ' || new.title || ' » vient d''être publié sur Yad Kheir',
      '/events/' || new.id
    from public.organization_members m
    where m.org_id = new.org_id
      and m.profile_id not in (
        select owner_id from public.organizations where id = new.org_id
      );
  end if;
  return new;
end;
$$;

create trigger on_event_published
  after insert or update of status
  on public.events
  for each row execute function public.notify_event_published();
