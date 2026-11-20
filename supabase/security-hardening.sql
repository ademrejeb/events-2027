-- ============================================================
-- Yed Lkhir — Security hardening (run AFTER admin-organizer-lifecycle.sql)
--
-- Goals:
--   * Replace self-referential RLS policies with SECURITY DEFINER helpers
--     (avoids "infinite recursion detected in policy" and keeps checks fast).
--   * Block suspended/banned accounts at the database layer, not only in APIs.
--   * Restrict organizer document uploads to approved organizers.
--   * Hide pending/rejected organizations from public reads.
--
-- Safe to re-run.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Helper functions (bypass RLS internally)
-- ------------------------------------------------------------
create or replace function public.is_org_member(
  p_org uuid,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where org_id = p_org
      and profile_id = p_user
  );
$$;

create or replace function public.is_account_active(
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select account_status = 'active' from public.profiles where id = p_user),
    false
  );
$$;

create or replace function public.is_approved_organizer(
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select organizer_status = 'approved' from public.profiles where id = p_user),
    false
  );
$$;

revoke all on function public.is_org_member(uuid, uuid) from public;
revoke all on function public.is_account_active(uuid) from public;
revoke all on function public.is_approved_organizer(uuid) from public;
grant execute on function public.is_org_member(uuid, uuid) to authenticated, anon;
grant execute on function public.is_account_active(uuid) to authenticated, anon;
grant execute on function public.is_approved_organizer(uuid) to authenticated, anon;

-- ------------------------------------------------------------
-- 2. ORGANIZATION MEMBERS — readable by members only (no recursion)
-- ------------------------------------------------------------
drop policy if exists "members are readable by authenticated users" on public.organization_members;
drop policy if exists "members readable by members" on public.organization_members;
create policy "members readable by members"
  on public.organization_members for select
  to authenticated
  using (public.is_org_member(org_id, auth.uid()));

-- ------------------------------------------------------------
-- 3. ORGANIZATIONS — public reads only for approved orgs
-- ------------------------------------------------------------
drop policy if exists "organizations are publicly readable" on public.organizations;
drop policy if exists "approved organizations are publicly readable" on public.organizations;
create policy "approved organizations are publicly readable"
  on public.organizations for select
  to anon, authenticated
  using (
    status = 'approved'
    or public.is_org_member(id, auth.uid())
  );

drop policy if exists "owners can update their organization" on public.organizations;
create policy "owners can update their organization"
  on public.organizations for update
  to authenticated
  using (
    public.is_org_member(id, auth.uid())
    and public.is_account_active(auth.uid())
  )
  with check (
    public.is_org_member(id, auth.uid())
    and public.is_account_active(auth.uid())
  );

-- ------------------------------------------------------------
-- 4. EVENTS — membership + active-account checks via helpers
-- ------------------------------------------------------------
drop policy if exists "organization members see their own events" on public.events;
create policy "organization members see their own events"
  on public.events for select
  to authenticated
  using (public.is_org_member(org_id, auth.uid()));

drop policy if exists "organization members can create events" on public.events;
create policy "organization members can create events"
  on public.events for insert
  to authenticated
  with check (
    public.is_account_active(auth.uid())
    and (
      public.is_org_member(org_id, auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'government'
      )
    )
  );

drop policy if exists "organization members can update their events" on public.events;
create policy "organization members can update their events"
  on public.events for update
  to authenticated
  using (
    public.is_account_active(auth.uid())
    and (
      public.is_org_member(org_id, auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'government'
      )
    )
  )
  with check (
    public.is_account_active(auth.uid())
    and (
      public.is_org_member(org_id, auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'government'
      )
    )
  );

drop policy if exists "organization members can delete their events" on public.events;
create policy "organization members can delete their events"
  on public.events for delete
  to authenticated
  using (
    public.is_account_active(auth.uid())
    and (
      public.is_org_member(org_id, auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'government'
      )
    )
  );

-- ------------------------------------------------------------
-- 5. VOLUNTEERS — active accounts only
-- ------------------------------------------------------------
drop policy if exists "users can volunteer for events" on public.volunteers;
create policy "users can volunteer for events"
  on public.volunteers for insert
  to authenticated
  with check (
    auth.uid() = profile_id
    and public.is_account_active(auth.uid())
  );

drop policy if exists "users can cancel their participation" on public.volunteers;
create policy "users can cancel their participation"
  on public.volunteers for delete
  to authenticated
  using (auth.uid() = profile_id);

-- ------------------------------------------------------------
-- 6. PROFILES — self reads + active gate on updates
-- ------------------------------------------------------------
drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------
-- 7. SOCIAL POSTS — membership via helper (no recursion)
-- ------------------------------------------------------------
drop policy if exists "members can read their social posts" on public.social_posts;
create policy "members can read their social posts"
  on public.social_posts for select
  to authenticated
  using (public.is_org_member(org_id, auth.uid()));

-- ------------------------------------------------------------
-- 8. STORAGE — organizer documents only from approved organizers
-- ------------------------------------------------------------
drop policy if exists "auth upload organizer-docs" on storage.objects;
create policy "auth upload organizer-docs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'organizer-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved_organizer(auth.uid())
  );

-- ------------------------------------------------------------
-- 9. Refresh schema cache
-- ------------------------------------------------------------
notify pgrst, 'reload schema';
