-- ============================================================
-- Central (platform-owned) social accounts + cross-posting.
--
-- The platform admin connects one Facebook Page and one Instagram
-- Business account. Organization posts are republished there with
-- hashtags identifying the issuing organization.
--
-- Tokens live only in this table and are encrypted by the app
-- (TOKEN_ENCRYPTION_KEY). RLS is enabled with no policies: only the
-- service role can read or write them.
-- ============================================================

create table if not exists public.platform_social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook', 'instagram')),
  account_id text not null,
  account_name text,
  public_url text,
  access_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform)
);

alter table public.platform_social_accounts enable row level security;

alter table public.social_posts
  alter column org_id drop not null,
  add column if not exists scope text not null default 'organization'
    check (scope in ('organization', 'platform', 'crosspost')),
  add column if not exists source_org_id uuid references public.organizations (id) on delete set null,
  add column if not exists source_post_id uuid references public.social_posts (id) on delete set null;

create index if not exists social_posts_scope_created_idx
  on public.social_posts (scope, created_at desc);

create index if not exists social_posts_source_org_idx
  on public.social_posts (source_org_id, created_at desc);
