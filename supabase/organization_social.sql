-- ============================================================
-- Social publishing for organizations (Facebook & Instagram)
-- Access tokens are stored server-side only. No client policies are
-- granted on the accounts table; only the service role may read it.
-- ============================================================

create table if not exists public.organization_social_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  platform text not null check (platform in ('facebook', 'instagram')),
  account_id text not null,
  account_name text,
  access_token text not null,
  created_at timestamptz not null default now(),
  unique (org_id, platform)
);

alter table public.organization_social_accounts enable row level security;
-- Intentionally no policies: tokens are never exposed through the public API.

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  caption text,
  image_url text,
  link_url text,
  platforms text[] not null default '{}',
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.social_posts enable row level security;

drop policy if exists "members can read their social posts" on public.social_posts;
create policy "members can read their social posts"
  on public.social_posts for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members m
      where m.org_id = social_posts.org_id
        and m.profile_id = auth.uid()
    )
  );
