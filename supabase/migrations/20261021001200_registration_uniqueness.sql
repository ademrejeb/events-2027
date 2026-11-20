-- One registration per person per event.
--
-- A person can register either as a signed-in volunteer (public.volunteers,
-- PK on event_id + profile_id) or through the account-free form
-- (public.event_participants). This migration links guest registrations to a
-- profile when the visitor is signed in and guarantees uniqueness both by
-- profile and by e-mail.

alter table public.event_participants
  add column if not exists profile_id uuid references public.profiles (id) on delete set null;

create index if not exists event_participants_profile_idx
  on public.event_participants (profile_id)
  where profile_id is not null;

create unique index if not exists event_participants_event_email_uidx
  on public.event_participants (event_id, lower(email))
  where email is not null;

create unique index if not exists event_participants_event_profile_uidx
  on public.event_participants (event_id, profile_id)
  where profile_id is not null;

-- Backfill the profile link for earlier guest registrations whose e-mail
-- matches an existing account. Safe to re-run.
update public.event_participants ep
set profile_id = u.id
from auth.users u
where ep.profile_id is null
  and ep.email is not null
  and lower(ep.email) = lower(u.email)
  and not exists (
    select 1
    from public.event_participants other
    where other.event_id = ep.event_id
      and other.profile_id = u.id
      and other.id <> ep.id
  );
