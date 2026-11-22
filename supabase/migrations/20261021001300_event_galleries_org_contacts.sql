-- ============================================================
-- Multiple before/after photos per event, and public contact
-- channels (phone, email, website, Facebook, Instagram).
--
-- Additive only: the legacy single-image columns are copied into
-- the new arrays but kept, so the currently deployed build keeps
-- working while the new build rolls out. Drop them in a later
-- migration once the new code is live.
-- Safe to re-run.
-- ============================================================

alter table public.events
  add column if not exists before_images text[] not null default '{}',
  add column if not exists after_images text[] not null default '{}';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'before_image_url'
  ) then
    update public.events
       set before_images = array[before_image_url]
     where before_image_url is not null
       and cardinality(before_images) = 0;

    update public.events
       set after_images = array[after_image_url]
     where after_image_url is not null
       and cardinality(after_images) = 0;
  end if;
end $$;

alter table public.organizations
  add column if not exists facebook_url text,
  add column if not exists instagram_url text;
