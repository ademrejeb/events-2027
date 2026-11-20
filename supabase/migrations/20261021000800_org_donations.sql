-- Donation/financial support fields for organizations
alter table public.organizations
  add column if not exists rib_holder text,
  add column if not exists bank_name text,
  add column if not exists rib text,
  add column if not exists donation_instructions text,
  add column if not exists donation_url text;