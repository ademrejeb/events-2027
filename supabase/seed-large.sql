delete from public.feedback where contact_email like 'loadtest.%';
delete from public.organizer_applications where email like 'loadtest.%';
delete from public.admin_audit_log where actor_email like 'loadtest.%';
delete from auth.users where email like 'loadtest.user%@example.com';

with seed_users as (
  select
    n,
    ('d0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid as id,
    format('loadtest.user%s@example.com', lpad(n::text, 4, '0')) as email,
    (array[
      'Yassine', 'Amira', 'Mehdi', 'Salma', 'Ahmed', 'Ines', 'Karim', 'Nour',
      'Sami', 'Rania', 'Bilel', 'Hiba', 'Anis', 'Mariem', 'Walid', 'Sarra',
      'Aymen', 'Farah', 'Hamza', 'Dorra'
    ])[1 + ((n - 1) % 20)]
    || ' ' ||
    (array[
      'Ben Ali', 'Trabelsi', 'Mansour', 'Gharbi', 'Jaziri', 'Bouazizi',
      'Khelifi', 'Sassi', 'Ayari', 'Bennour', 'Mabrouk', 'Chaabane',
      'Ferchichi', 'Hamdi', 'Mejri', 'Ouali', 'Riahi', 'Souissi'
    ])[1 + ((n - 1) % 18)] as full_name
  from generate_series(1, 240) n
)
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  id,
  'authenticated',
  'authenticated',
  email,
  crypt('password123', gen_salt('bf', 6)),
  now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('full_name', full_name, 'role', 'individual'),
  now() - ((n % 300) || ' days')::interval,
  now()
from seed_users
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  jsonb_build_object(
    'sub', u.id,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from auth.users u
where u.email like 'loadtest.user%@example.com'
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
 where email like 'loadtest.user%@example.com';

insert into public.profiles (id, full_name, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', 'Bénévole'),
  'individual'
from auth.users u
where u.email like 'loadtest.user%@example.com'
on conflict (id) do nothing;

update public.profiles p
set role = 'organization',
    organizer_status = 'approved',
    account_status = 'active'
from auth.users u
where u.id = p.id
  and u.email in (
    select format('loadtest.user%s@example.com', lpad(n::text, 4, '0'))
    from generate_series(1, 60) n
  );

with org_seed as (
  select
    n,
    ('e0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid as id,
    ('d0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid as owner_id,
    (array[
      'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Bizerte',
      'Sousse', 'Sfax', 'Kairouan', 'Gabès', 'Médenine', 'Gafsa',
      'Kasserine', 'Jendouba', 'Béja', 'Mahdia', 'Monastir', 'Djerba',
      'Tozeur', 'Kébili'
    ])[1 + ((n - 1) % 20)] as city,
    (array[
      'Association', 'Fondation', 'Club', 'ONG', 'Initiative', 'Collectif'
    ])[1 + ((n - 1) % 6)] as kind,
    (array[
      'El Amal', 'El Khir', 'Nour', 'Espoir', 'Solidarité', 'Les Mains Vertes',
      'Jeunesse Active', 'El Wafa', 'Sidi Bou', 'Horizon', 'El Baraka', 'Tunisie Verte'
    ])[1 + ((n - 1) % 12)] as label
  from generate_series(1, 60) n
)
insert into public.organizations (
  id, owner_id, name, type, description, city, verified, status,
  public_email, public_phone, website, rib_holder, bank_name, rib,
  donation_instructions, donation_url, created_at, updated_at
)
select
  id,
  owner_id,
  format('%s %s', kind, label),
  (array[
    'association', 'charity', 'club', 'ngo', 'government', 'other', 'individual'
  ])[1 + ((n - 1) % 7)]::public.organization_type,
  format(
    '%s %s agit à %s dans l''éducation, l''environnement et la solidarité. '
    || 'Nous organisons des actions de terrain avec les habitants et les bénévoles.',
    kind, label, city
  ),
  city,
  n % 6 <> 0,
  'approved',
  format('contact.org%s@example.com', lpad(n::text, 3, '0')),
  format('+216 7%s %s %s', lpad((n % 10)::text, 1, '0'), lpad((n % 100)::text, 2, '0'), lpad((n % 1000)::text, 3, '0')),
  format('https://example.com/organisations/%s', n),
  format('%s %s', kind, label),
  (array[
    'Banque de Tunisie', 'Amen Bank', 'BIAT', 'UIB', 'Attijari Bank', 'Zitouna Bank'
  ])[1 + ((n - 1) % 6)],
  'TN59' || lpad((10000000000000000000 + n)::text, 20, '0'),
  'Votre don finance directement les actions de terrain de cette organisation.',
  case when n % 4 = 0 then format('https://example.com/don/%s', n) else null end,
  now() - ((n % 240) || ' days')::interval,
  now() - ((n % 30) || ' days')::interval
from org_seed
on conflict (id) do nothing;

insert into public.organization_members (org_id, profile_id, role_in_org)
select
  ('e0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  ('d0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'admin'
from generate_series(1, 60) n
on conflict (org_id, profile_id) do nothing;

insert into public.organization_members (org_id, profile_id, role_in_org)
select
  ('e0000000-0000-4000-8000-' || lpad((((n - 61) % 60) + 1)::text, 12, '0'))::uuid,
  ('d0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'member'
from generate_series(61, 240) n
on conflict (org_id, profile_id) do nothing;

with cities as (
  select * from (values
    (1, 'Tunis', 36.8065, 10.1815),
    (2, 'Ariana', 36.8663, 10.1645),
    (3, 'Ben Arous', 36.7531, 10.2189),
    (4, 'Manouba', 36.8101, 10.0863),
    (5, 'Nabeul', 36.4561, 10.7376),
    (6, 'Bizerte', 37.2744, 9.8739),
    (7, 'Sousse', 35.8256, 10.6084),
    (8, 'Sfax', 34.7406, 10.7603),
    (9, 'Kairouan', 35.6781, 10.0963),
    (10, 'Gabès', 33.8815, 10.0982),
    (11, 'Médenine', 33.3549, 10.5055),
    (12, 'Gafsa', 34.4250, 8.7842),
    (13, 'Kasserine', 35.1676, 8.8365),
    (14, 'Jendouba', 36.5011, 8.7802),
    (15, 'Béja', 36.7256, 9.1817),
    (16, 'Mahdia', 35.5047, 11.0622),
    (17, 'Monastir', 35.7770, 10.8262),
    (18, 'Djerba', 33.8076, 10.8451),
    (19, 'Tozeur', 33.9197, 8.1335),
    (20, 'Kébili', 33.7044, 8.9690)
  ) as t(id, city, lat, lng)
),
event_seed as (
  select
    n,
    ('f0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid as id,
    ('e0000000-0000-4000-8000-' || lpad((((n - 1) % 60) + 1)::text, 12, '0'))::uuid as org_id,
    (array[
      'cleaning', 'ramadan', 'school', 'charity', 'health', 'environment', 'other'
    ])[1 + ((n - 1) % 7)] as category_slug,
    (array[
      'Nettoyage citoyen', 'Distribution de paniers', 'Collecte de fournitures',
      'Journée de reboisement', 'Don de sang', 'Atelier de sensibilisation',
      'Visite aux familles', 'Course solidaire', 'Réparation d''une école',
      'Plantation d''arbres', 'Collecte de vêtements', 'Action de quartier'
    ])[1 + ((n - 1) % 12)] as title_label,
    (array[
      'Place principale', 'Centre culturel', 'École primaire', 'Maison de quartier',
      'Parc municipal', 'Stade', 'Marché central', 'Centre de santé'
    ])[1 + ((n - 1) % 8)] as venue,
    c.city,
    c.lat,
    c.lng
  from generate_series(1, 900) n
  join cities c on c.id = ((((n - 1) % 20) + 1))
)
insert into public.events (
  id, org_id, category_id, title, description, location, city,
  start_at, end_at, max_volunteers, status, created_at, lat, lng, locations
)
select
  id,
  org_id,
  (select id from public.event_categories where slug = category_slug),
  title_label || ' - ' || city,
  format(
    '%s à %s. Une action ouverte aux habitants et aux bénévoles, '
    || 'organisée avec des partenaires locaux. Matériel et encadrement fournis.',
    title_label, city
  ),
  venue || ', ' || city,
  city,
  date_trunc('day', now())
    + (((n * 7) % 420) - 150) * interval '1 day'
    + interval '9 hours',
  date_trunc('day', now())
    + (((n * 7) % 420) - 150) * interval '1 day'
    + interval '13 hours',
  30 + ((n % 8) * 15),
  case
    when n % 17 = 0 then 'draft'
    when n % 23 = 0 then 'completed'
    when n % 41 = 0 then 'cancelled'
    else 'published'
  end::public.event_status,
  now() - ((n % 240) || ' days')::interval,
  lat,
  lng,
  jsonb_build_array(
    jsonb_build_object('label', venue, 'lat', lat, 'lng', lng)
  )
from event_seed
on conflict (id) do nothing;

insert into public.volunteers (event_id, profile_id, joined_at)
select
  e.id,
  u.id,
  now() - ((e.rn % 90) || ' days')::interval
from (
  select id, row_number() over (order by id) as rn
  from public.events
  where status = 'published'
    and start_at > now() + interval '1 day'
) e
cross join lateral (
  select au.id
  from auth.users au
  where au.email like 'loadtest.user%@example.com'
  order by md5(au.id::text || e.rn::text)
  limit 18
) u
on conflict (event_id, profile_id) do nothing;

insert into public.event_participants (
  event_id, profile_id, full_name, phone, email, participants_count,
  skills, message, created_at, status, privacy_accepted_at, email_hash, ip_hash
)
select
  e.id,
  null,
  (array[
    'Yassine Ben Ali', 'Amira Trabelsi', 'Mehdi Mansour', 'Salma Gharbi',
    'Ahmed Jaziri', 'Ines Bouazizi', 'Karim Khelifi', 'Nour Sassi',
    'Sami Ayari', 'Rania Bennour', 'Bilel Mabrouk', 'Hiba Chaabane'
  ])[1 + ((p - 1) % 12)]
    || ' ' || e.rn::text,
  format('+216 9%s %s %s', (p % 10)::text, lpad((p % 100)::text, 2, '0'), lpad(e.rn::text, 3, '0')),
  format('loadtest.participant.%s.%s@example.com', e.rn, p),
  1 + (p % 4),
  (array[
    'Logistique', 'Accueil', 'Distribution', 'Sensibilisation', 'Photographie',
    'Premiers secours', 'Jardinage', 'Animation'
  ])[1 + ((p - 1) % 8)],
  'Je souhaite participer à cette action.',
  now() - ((e.rn + p) % 180) * interval '1 day',
  'submitted',
  now() - ((e.rn + p) % 180) * interval '1 day',
  md5(format('loadtest.participant.%s.%s@example.com', e.rn, p)),
  md5(e.id::text || p::text)
from (
  select id, row_number() over (order by id) as rn
  from public.events
  where status = 'published'
) e
cross join generate_series(1, 20) p;

insert into public.feedback (
  type, subject, message, contact_email, status, admin_note, created_at, resolved_at
)
select
  (array['improvement', 'bug', 'data', 'other'])[1 + ((n - 1) % 4)],
  'Retour de test ' || n,
  'Ceci est un message de test généré pour vérifier la boîte de réception, les filtres et la pagination.',
  format('loadtest.feedback%s@example.com', lpad(n::text, 4, '0')),
  (array['open', 'in_review', 'resolved', 'dismissed'])[1 + ((n - 1) % 4)],
  case when n % 4 = 2 then 'Pris en charge par l''équipe.' else null end,
  now() - ((n % 120) || ' days')::interval,
  case when n % 4 = 2 then now() - ((n % 30) || ' days')::interval else null end
from generate_series(1, 250) n;

insert into public.organizer_applications (
  name, kind, contact_name, email, phone, city, description, links,
  status, review_note, reviewed_at, created_at, updated_at
)
select
  format('%s Candidat %s', (array['Association', 'Fondation', 'Club', 'ONG'])[1 + ((n - 1) % 4)], n),
  (array['association', 'charity', 'club', 'ngo', 'other'])[1 + ((n - 1) % 5)]::public.organization_type,
  (array['Yassine', 'Amira', 'Mehdi', 'Salma', 'Ahmed'])[1 + ((n - 1) % 5)] || ' ' || n::text,
  format('loadtest.application%s@example.com', lpad(n::text, 4, '0')),
  format('+216 8%s %s %s', (n % 10)::text, lpad((n % 100)::text, 2, '0'), lpad((n % 1000)::text, 3, '0')),
  (array['Tunis', 'Sousse', 'Sfax', 'Bizerte', 'Gabès'])[1 + ((n - 1) % 5)],
  'Candidature de test avec une description suffisamment longue pour vérifier l''affichage et la revue administrateur.',
  format('https://example.com/candidats/%s', n),
  (array['pending', 'approved', 'rejected', 'withdrawn'])[1 + ((n - 1) % 4)]::public.application_status,
  case when n % 4 = 3 then 'Dossier incomplet.' else null end,
  case when n % 4 = 1 then null else now() - ((n % 20) || ' days')::interval end,
  now() - ((n % 90) || ' days')::interval,
  now() - ((n % 10) || ' days')::interval
from generate_series(1, 90) n;

insert into public.social_posts (
  org_id, author_id, caption, image_url, link_url, platforms, results, created_at
)
select
  ('e0000000-0000-4000-8000-' || lpad((((n - 1) % 60) + 1)::text, 12, '0'))::uuid,
  ('d0000000-0000-4000-8000-' || lpad((((n - 1) % 60) + 1)::text, 12, '0'))::uuid,
  format('Retour sur notre action solidaire #%s. Merci à tous les bénévoles !', n),
  null,
  format('https://example.com/actions/%s', n),
  case when n % 2 = 0 then array['facebook'] else array['facebook', 'instagram'] end,
  '[]'::jsonb,
  now() - ((n % 180) || ' days')::interval
from generate_series(1, 180) n;

insert into public.admin_audit_log (
  actor_email, action, target_type, target_id, metadata, created_at
)
select
  'loadtest.admin@example.com',
  (array['application.approved', 'organization.verified', 'user.suspended', 'event.removed', 'feedback.resolved'])[1 + ((n - 1) % 5)],
  (array['application', 'organization', 'profile', 'event', 'feedback'])[1 + ((n - 1) % 5)],
  (gen_random_uuid())::text,
  jsonb_build_object('source', 'large-seed', 'batch', n),
  now() - ((n % 60) || ' days')::interval
from generate_series(1, 200) n;

insert into public.profile_badges (profile_id, badge_id, awarded_at)
select
  u.id,
  b.id,
  now() - ((u.rn % 120) || ' days')::interval
from (
  select id, row_number() over (order by id) as rn
  from auth.users
  where email like 'loadtest.user%@example.com'
) u
cross join (
  select id, row_number() over (order by slug) as rn
  from public.badges
) b
where (u.rn + b.rn) % 5 = 0
on conflict (profile_id, badge_id) do nothing;

insert into public.notifications (
  user_id, type, title, body, link, read_at, created_at
)
select
  u.id,
  (array['event_joined', 'event_created', 'volunteer_joined', 'org_invite'])[1 + ((n - 1) % 4)]::public.notification_type,
  (array['Nouvelle action', 'Inscription confirmée', 'Nouveau bénévole', 'Invitation'])[1 + ((n - 1) % 4)],
  'Notification de test générée pour la pagination et le compteur de non-lus.',
  format('/events/f0000000-0000-4000-8000-%s', lpad((((n - 1) % 900) + 1)::text, 12, '0')),
  case when n % 3 = 0 then now() - interval '1 day' else null end,
  now() - ((n % 90) || ' days')::interval
from (
  select id, row_number() over (order by id) as rn
  from auth.users
  where email like 'loadtest.user%@example.com'
) u
cross join generate_series(1, 6) n
where u.rn <= 120;

analyze public.profiles;
analyze public.organizations;
analyze public.organization_members;
analyze public.events;
analyze public.volunteers;
analyze public.event_participants;
analyze public.notifications;
analyze public.feedback;
analyze public.organizer_applications;

notify pgrst, 'reload schema';
