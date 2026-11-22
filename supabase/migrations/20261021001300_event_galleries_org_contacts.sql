-- ============================================================
-- Multiple before/after photos per event, and public contact
-- channels (phone, email, website, Facebook, Instagram).
--
-- Run this migration BEFORE deploying the code that uses the
-- new columns; the old single-image columns are folded into the
-- arrays and then removed.
-- ============================================================

alter table public.events
  add column if not exists before_images text[] not null default '{}',
  add column if not exists after_images text[] not null default '{}';

-- Fold existing single images into the galleries (idempotent).
update public.events
   set before_images = array[before_image_url]
 where before_image_url is not null
   and cardinality(before_images) = 0;

update public.events
   set after_images = array[after_image_url]
 where after_image_url is not null
   and cardinality(after_images) = 0;

alter table public.events
  drop column if exists before_image_url,
  drop column if exists after_image_url;

alter table public.organizations
  add column if not exists facebook_url text,
  add column if not exists instagram_url text;
