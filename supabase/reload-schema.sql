-- Run this in the Supabase SQL editor if PostgREST reports a column missing
-- even though the migration succeeded (e.g. "Could not find the 'locations'
-- column of 'events' in the schema cache").
--
-- Re-applies the optional columns idempotently, then asks PostgREST to
-- reload its schema cache.

alter table public.events
  add column if not exists locations jsonb not null default '[]'::jsonb,
  add column if not exists before_images text[] not null default '{}',
  add column if not exists after_images text[] not null default '{}',
  add column if not exists gallery_urls text[];

alter table public.organizations
  add column if not exists public_email text,
  add column if not exists public_phone text,
  add column if not exists website text,
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists rib_holder text,
  add column if not exists bank_name text,
  add column if not exists rib text,
  add column if not exists donation_instructions text,
  add column if not exists donation_url text;

notify pgrst, 'reload schema';
