-- ============================================================
-- CLEANUP: removes ghost/leftover auth.users + auth.identities
-- rows for the demo emails that block the admin API from
-- recreating them ("Database error checking email").
--
-- Run this in the Supabase SQL editor, then re-run:
--   node scripts/create-demo-users.mjs
-- ============================================================

begin;

-- 1) Drop any orphan identities pointing at the demo emails.
delete from auth.identities i
where i.identity_data ->> 'email' in (
  'demo.benevole@gmail.com',
  'demo.croissantrouge@gmail.com',
  'demo.jci@gmail.com',
  'demo.mairie@gmail.com'
);

-- 2) Drop any leftover auth.users rows (cascades their profiles).
delete from auth.users u
where u.email in (
  'demo.benevole@gmail.com',
  'demo.croissantrouge@gmail.com',
  'demo.jci@gmail.com',
  'demo.mairie@gmail.com'
);

-- 3) Drop the seed profiles tied to the old fixed UUIDs so the
--    script's fresh users get clean profiles.
delete from public.profiles p
where p.id in (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000004'
);

commit;
