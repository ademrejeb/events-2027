-- ============================================================
-- Production hardening — run AFTER schema.sql in the SQL editor.
-- Adds indexes for large datasets and a race-safe capacity
-- check on volunteer signups.
-- ============================================================

-- Partial index so "published events sorted by start_at" is a
-- narrow index scan even with millions of rows.
create index if not exists events_published_start_at_idx
  on public.events (start_at, id)
  where status = 'published';

-- pg_trgm index so `city ilike '%x%'` searches stay fast.
create extension if not exists pg_trgm;
create index if not exists events_city_trgm_idx
  on public.events using gin (city gin_trgm_ops);

-- Speed up counts of volunteers for a given event (already backed
-- by the PK on (event_id, profile_id), this adds nothing extra,
-- but a descending joined_at index helps the roster query).
create index if not exists volunteers_joined_at_idx
  on public.volunteers (event_id, joined_at);

-- ============================================================
-- Capacity + rules enforcement. Runs in the database so two
-- volunteers clicking "join" at the exact same instant can never
-- oversubscribe an event. The `for update` lock serializes
-- inserts per event.
-- ============================================================
create or replace function public.enforce_volunteer_rules()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  e_status public.event_status;
  e_start_at timestamptz;
  e_max int;
  current_count int;
begin
  select status, start_at, max_volunteers
    into e_status, e_start_at, e_max
    from public.events
   where id = new.event_id
     for update;

  if e_status <> 'published' then
    raise exception 'Cet événement n''est pas ouvert aux inscriptions';
  end if;

  if e_start_at < now() then
    raise exception 'Cet événement a déjà commencé';
  end if;

  if e_max is not null then
    select count(*) into current_count
      from public.volunteers
     where event_id = new.event_id;
    if current_count >= e_max then
      raise exception 'Cet événement est complet';
    end if;
  end if;

  return new;
end;
$$;

create trigger volunteers_rules_check
  before insert on public.volunteers
  for each row execute function public.enforce_volunteer_rules();
