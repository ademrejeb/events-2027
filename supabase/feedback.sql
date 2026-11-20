-- ============================================================
-- Yed Lkhir — Feedback / bug & improvement reports
--
-- Public form (About page) → server API (service role) → admin dashboard.
-- No public read/insert policies: the table is server-only. The API
-- validates, rate-limits and hashes the client IP before inserting.
--
-- Safe to re-run.
-- ============================================================

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'other'
    check (type in ('improvement', 'bug', 'data', 'other')),
  subject text not null
    check (char_length(subject) between 3 and 160),
  message text not null
    check (char_length(message) between 10 and 4000),
  contact_email text,
  user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  admin_note text,
  ip_hash text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);

create index if not exists feedback_status_created_idx
  on public.feedback (status, created_at desc);

create index if not exists feedback_type_idx
  on public.feedback (type);

alter table public.feedback enable row level security;
-- No policies on purpose: reads/writes only through the server API
-- (service role). This keeps reporter contact data private.

notify pgrst, 'reload schema';
