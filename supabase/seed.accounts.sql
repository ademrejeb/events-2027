-- Demo accounts only — no organizations, events, registrations or feedback.
-- Run after schema.sql in the Supabase SQL editor (or `supabase db reset`).
--
-- Accounts (password for all: password123)
--   demo.benevole@gmail.com       individual volunteer
--   demo.croissantrouge@gmail.com organization (approved)
--   demo.jci@gmail.com            organization (approved)
--   demo.mairie@gmail.com         government (approved)
--   admin@yedlkhir.tn             platform admin
--
-- Duplicated from seed.sql on purpose: that file also seeds a full demo estate.

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'demo.croissantrouge@gmail.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Croissant Rouge Tunisien","role":"organization"}',
    now(), now()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'demo.jci@gmail.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"JCI Tunis","role":"organization"}',
    now(), now()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'demo.mairie@gmail.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Municipalité de Tunis","role":"government"}',
    now(), now()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000004',
    'authenticated', 'authenticated',
    'demo.benevole@gmail.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sami Ben Ali","role":"individual"}',
    now(), now()
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000005',
    'authenticated', 'authenticated',
    'admin@yedlkhir.tn',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Administrateur Yed Lkhir","role":"organization"}',
    now(), now()
  )
on conflict (id) do nothing;

-- The profiles are created by the on_auth_user_created trigger.
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id,
  jsonb_build_object('sub', u.id, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
from auth.users u
where u.id in (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000005'
)
on conflict (provider_id, provider) do nothing;

-- GoTrue expects the default instance id and non-NULL token strings.
update auth.users
   set instance_id = '00000000-0000-0000-0000-000000000000',
       confirmation_token = coalesce(confirmation_token, ''),
       recovery_token = coalesce(recovery_token, ''),
       email_change_token_new = coalesce(email_change_token_new, ''),
       email_change = coalesce(email_change, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       phone_change = coalesce(phone_change, ''),
       phone_change_token = coalesce(phone_change_token, ''),
       reauthentication_token = coalesce(reauthentication_token, '')
 where id in (
   'aaaaaaaa-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000004',
   'aaaaaaaa-0000-0000-0000-000000000005'
 );

-- Organizer accounts can use the organizer area; the admin can open /admin.
update public.profiles
   set organizer_status = 'approved'
 where id in (
   'aaaaaaaa-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000005'
 );

update public.profiles
   set is_admin = true,
       account_status = 'active',
       organizer_status = 'approved',
       role = 'organization'
 where id = 'aaaaaaaa-0000-0000-0000-000000000005';
