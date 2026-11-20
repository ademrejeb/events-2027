-- Event photo categories
alter table public.events
  add column if not exists before_image_url text,
  add column if not exists after_image_url text,
  add column if not exists gallery_urls text[];