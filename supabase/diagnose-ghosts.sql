-- ============================================================
-- DIAGNOSTIC: run this in the Supabase SQL editor and paste the
-- results back. It checks for ghost auth.users / auth.identities
-- rows blocking the demo email creation.
-- ============================================================

select 'auth.users (demo)' as src, u.id, u.email, u.deleted_at
from auth.users u
where u.email in (
  'demo.benevole@gmail.com',
  'demo.croissantrouge@gmail.com',
  'demo.jci@gmail.com',
  'demo.mairie@gmail.com'
)
union all
select 'auth.identities (demo)', i.id, i.identity_data->>'email', i.user_id
from auth.identities i
where i.identity_data->>'email' in (
  'demo.benevole@gmail.com',
  'demo.croissantrouge@gmail.com',
  'demo.jci@gmail.com',
  'demo.mairie@gmail.com'
)
union all
select 'orphan identity (demo)', i.id, i.identity_data->>'email', i.user_id
from auth.identities i
left join auth.users u on u.id = i.user_id
where u.id is null
  and i.identity_data->>'email' in (
    'demo.benevole@gmail.com',
    'demo.croissantrouge@gmail.com',
    'demo.jci@gmail.com',
    'demo.mairie@gmail.com'
  );
