import { createServerClient } from "@supabase/ssr";
import type { GetServerSidePropsContext, GetServerSidePropsResult } from "next";
import type { Database } from "./supabase/types";
import { adminClient } from "./supabase/admin";
import type { ProfileRow } from "./authz";

/**
 * Auth for getServerSideProps. Session cookies are read-only here (refresh is
 * handled by proxy.ts); the profile â€” including status/is_admin â€” is loaded
 * with the service role so the values are trustworthy.
 */
export async function getServerAuthContext(ctx: GetServerSidePropsContext) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(ctx.req.cookies)
            .filter((e): e is [string, string] => e[1] !== undefined)
            .map(([name, value]) => ({ name, value }));
        },
        setAll() {
          /* handled by proxy.ts */
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as ProfileRow | null };

  const { data: profile } = await adminClient()
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: (profile as ProfileRow | null) ?? null };
}

/** Redirects non-admins to login/home. Returns profile props on success. */
export async function requireAdminPage(
  ctx: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<{ profile: ProfileRow }>> {
  const { user, profile } = await getServerAuthContext(ctx);
  if (!user) {
    return {
      redirect: { destination: `/login?next=${encodeURIComponent(ctx.resolvedUrl)}`, permanent: false },
    };
  }
  if (!profile?.is_admin || profile.account_status !== "active") {
    return { redirect: { destination: "/", permanent: false } };
  }
  return { props: { profile } };
}

/** Redirects non-approved organizers (and non-admins) away. */
export async function requireOrganizerPage(
  ctx: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<{ profile: ProfileRow }>> {
  const { user, profile } = await getServerAuthContext(ctx);
  if (!user) {
    return {
      redirect: { destination: `/login?next=${encodeURIComponent(ctx.resolvedUrl)}`, permanent: false },
    };
  }
  const active = profile?.account_status === "active";
  const approved = profile?.organizer_status === "approved";
  if (!active || (!approved && !profile?.is_admin)) {
    return { redirect: { destination: "/", permanent: false } };
  }
  return { props: { profile } };
}
