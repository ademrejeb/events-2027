-- Optional multiple locations per event (jsonb array of {label, lat, lng})
alter table public.events
  add column if not exists locations jsonb not null default '[]'::jsonb;