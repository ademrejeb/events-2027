-- ============================================================
-- Demo / seed data — run this in the Supabase SQL editor AFTER
-- schema.sql (or it re-applies safely if you run it again).
--
-- Test accounts (password for all: password123)
--   individual : demo.benevole@gmail.com
--   organization: demo.croissantrouge@gmail.com
--   organization: demo.jci@gmail.com
--   government : demo.mairie@gmail.com
-- ============================================================

-- Volunteer counts are aggregated server-side with the service role, so
-- rosters stay private. Do not re-open the RLS policy here.

-- ---------- DEMO AUTH USERS ----------
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

-- The profiles are created automatically by the on_auth_user_created trigger,
-- so no inserts into public.profiles are needed here.

-- Link identities so email+password sign in works.
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

-- GoTrue expects the default instance id and non-NULL token strings. Direct
-- inserts into auth.users leave these NULL, which breaks password sign-in.
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

-- Seeded organizers are approved and the seeded admin can open /admin.
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

-- ---------- DEMO ORGANIZATIONS ----------
insert into public.organizations (
  id, owner_id, name, type, description, city, verified, status
)
values
  (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'Croissant Rouge Tunisien',
    'ngo',
    'Assistance humanitaire et actions de solidarité dans toute la Tunisie.',
    'Tunis',
    true,
    'approved'
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'JCI Tunis',
    'club',
    'Jeunes leaders engagés pour le développement de la communauté.',
    'Tunis',
    true,
    'approved'
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'Municipalité de Tunis',
    'government',
    'Institution publique au service des citoyens de la capitale.',
    'Tunis',
    true,
    'approved'
  )
on conflict (id) do nothing;

insert into public.organization_members (org_id, profile_id, role_in_org)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'admin'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'admin'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003', 'admin')
on conflict (org_id, profile_id) do nothing;

-- ---------- DEMO EVENTS ----------
insert into public.events (
  id, org_id, category_id, title, description, location, city,
  start_at, end_at, max_volunteers, status
) values
  (
    'cccccccc-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000003',
    (select id from public.event_categories where slug = 'cleaning'),
    'Nettoyage de la plage de Sidi Bou Saïd',
    'Rejoignez-nous pour une grande opération de nettoyage de la plage et des rochers. Sacs et gants fournis sur place.',
    'Plage de Sidi Bou Saïd',
    'Sidi Bou Saïd',
    now() + interval '10 days 8 hours',
    now() + interval '10 days 13 hours',
    60,
    'published'
  ),
  (
    'cccccccc-0000-0000-0000-000000000002',
    'bbbbbbbb-0000-0000-0000-000000000001',
    (select id from public.event_categories where slug = 'ramadan'),
    'Coussines ramadhan pour 200 familles',
    'Préparation et distribution de coussines (repas d\u0027iftar) pour les familles en situation précaire pendant le mois de Ramadan.',
    'Centre culturel El Menzah',
    'Tunis',
    now() + interval '20 days 16 hours',
    now() + interval '20 days 21 hours',
    40,
    'published'
  ),
  (
    'cccccccc-0000-0000-0000-000000000003',
    'bbbbbbbb-0000-0000-0000-000000000002',
    (select id from public.event_categories where slug = 'school'),
    'Cartables & fournitures scolaires',
    'Collecte et distribution de cartables, cahiers et fournitures pour la rentrée des enfants issus de familles modestes.',
    'École primaire Bab Jazira',
    'Tunis',
    now() + interval '30 days 9 hours',
    now() + interval '30 days 15 hours',
    25,
    'published'
  ),
  (
    'cccccccc-0000-0000-0000-000000000004',
    'bbbbbbbb-0000-0000-0000-000000000001',
    (select id from public.event_categories where slug = 'health'),
    'Collecte de sang — Croissant Rouge',
    'Grande collecte de sang ouverte à tous les donneurs. Passeport médical ou carte d\u0027identité requis.',
    'Institut National de Transfusion Sanguine',
    'Tunis',
    now() + interval '40 days 9 hours',
    now() + interval '40 days 17 hours',
    100,
    'published'
  ),
  (
    'cccccccc-0000-0000-0000-000000000005',
    'bbbbbbbb-0000-0000-0000-000000000002',
    (select id from public.event_categories where slug = 'environment'),
    'Journée de reboisement à La Marsa',
    'Plantation de jeunes arbres avec les écoles de la région. Sensibilisation à l\u0027environnement pour les enfants.',
    'Parc de La Marsa',
    'La Marsa',
    now() + interval '50 days 9 hours',
    now() + interval '50 days 13 hours',
    50,
    'published'
  ),
  (
    'cccccccc-0000-0000-0000-000000000006',
    'bbbbbbbb-0000-0000-0000-000000000001',
    (select id from public.event_categories where slug = 'charity'),
    'Sahour solidaire en plein air',
    'Un sahour collectif au profit des sans-abri du centre-ville. Distribution de repas et de couvertures.',
    'Avenue Habib Bourguiba',
    'Tunis',
    now() + interval '60 days 3 hours',
    now() + interval '60 days 6 hours',
    35,
    'published'
  )
on conflict (id) do nothing;

-- A few volunteers on the first event so the counts look alive.
insert into public.volunteers (event_id, profile_id)
values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004')
on conflict (event_id, profile_id) do nothing;
