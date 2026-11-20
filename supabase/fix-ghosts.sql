-- ============================================================
-- FIX: removes the ghost auth rows that block the demo logins
-- ("Database error checking email" when creating demo users).
--
-- Run this in the Supabase SQL editor, then re-run:
--   node scripts/create-demo-users.mjs
-- ============================================================

-- ---- BEFORE ----
select 'BEFORE ghost identities' as step, count(*) from auth.identities i
where i.identity_data ->> 'email' in ('demo.benevole@gmail.com','demo.croissantrouge@gmail.com','demo.jci@gmail.com','demo.mairie@gmail.com');
select 'BEFORE ghost users' as step, count(*) from auth.users u
where u.email in ('demo.benevole@gmail.com','demo.croissantrouge@gmail.com','demo.jci@gmail.com','demo.mairie@gmail.com');

-- ---- CLEANUP ----
begin;

-- Orphan identities pointing at the demo emails.
delete from auth.identities i
where i.identity_data ->> 'email' in (
  'demo.benevole@gmail.com',
  'demo.croissantrouge@gmail.com',
  'demo.jci@gmail.com',
  'demo.mairie@gmail.com'
);

-- Leftover auth.users rows (cascade removes their profiles).
delete from auth.users u
where u.email in (
  'demo.benevole@gmail.com',
  'demo.croissantrouge@gmail.com',
  'demo.jci@gmail.com',
  'demo.mairie@gmail.com'
);

-- Old seed profiles with the fixed UUIDs (the script creates fresh ones).
delete from public.profiles p
where p.id in (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000004'
);

commit;

-- ---- AFTER ----
select 'AFTER ghost identities' as step, count(*) from auth.identities i
where i.identity_data ->> 'email' in ('demo.benevole@gmail.com','demo.croissantrouge@gmail.com','demo.jci@gmail.com','demo.mairie@gmail.com');
select 'AFTER ghost users' as step, count(*) from auth.users u
where u.email in ('demo.benevole@gmail.com','demo.croissantrouge@gmail.com','demo.jci@gmail.com','demo.mairie@gmail.com');
select 'AFTER seed profiles' as step, count(*) from public.profiles p
where p.id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000004');
