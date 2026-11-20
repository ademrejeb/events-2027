-- Public participation (no account required)
create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  full_name text,
  phone text,
  email text,
  participants_count int not null default 1,
  skills text,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists event_participants_event_idx on public.event_participants (event_id);

alter table public.event_participants enable row level security;
-- Only organizers (via service role) can read; public can insert via API
create policy "Anyone can submit participation" on public.event_participants
  for insert to anon, authenticated with check (true);