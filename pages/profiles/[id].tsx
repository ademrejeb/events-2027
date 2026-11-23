import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/components/Layout";
import { useSession } from "@/lib/session";
import { formatEventDate } from "@/lib/format";
import BadgeTrackCard from "@/components/BadgeTrackCard";
import { type BadgeTrack } from "@/lib/badges";
import { Button } from "@adem.rejeb/ui";

type RecentEvent = { event_id: string; events: { id: string; title: string; start_at: string; city: string | null; image_url: string | null; organizations: { name: string; verified: boolean } | null } | null };
type ProfileData = {
  profile: { id: string; full_name: string | null; avatar_url: string | null; bio: string | null; role: string; created_at: string };
  badge_tracks: BadgeTrack[];
  badge_stats: {
    tenure_months: number;
    events_created: number;
    volunteers_reached: number;
    actions_joined: number;
  };
  badges_earned: number;
  volunteer_count: number;
  recent_events: RecentEvent[];
};

const ROLE_LABELS: Record<string, string> = { individual: "Bénévole", organization: "Organisation", government: "Gouvernement" };

export default function ProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: sessionLoading } = useSession();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    let active = true;
    fetch(`/api/profiles/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => { if (active) setData(d); })
      .catch(() => { if (active) setError("Profil introuvable"); })
      .finally(() => { if (active) setFetched(true); });
    return () => { active = false; };
  }, [id]);

  if (sessionLoading || !fetched) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="h-56 animate-pulse rounded-3xl bg-zinc-100" />
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Profil introuvable</h1>
          <Link href="/" className="mt-4 inline-block text-red-600 hover:underline">
            Retour à l&apos;accueil
          </Link>
        </div>
      </Layout>
    );
  }

  const { profile, badge_tracks, badge_stats, badges_earned, recent_events } = data;
  const isOwnProfile = user?.id === profile.id;

  return (
    <Layout>
      <div className="relative h-40 w-full bg-gradient-to-br from-red-600 via-red-700 to-orange-600">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_15%_30%,rgba(255,255,255,.3),transparent_40%),radial-gradient(circle_at_85%_50%,rgba(255,255,255,.25),transparent_40%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4">
        <div className="-mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-28 w-28 rounded-3xl border-4 border-white object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br from-red-500 to-orange-500 text-4xl font-extrabold text-white shadow-lg">
                {profile.full_name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="pb-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                {profile.full_name || "Bénévole anonyme"}
              </h1>
              <p className="mt-0.5 text-sm font-medium text-red-600">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </p>
            </div>
          </div>
          {isOwnProfile && (
            <Link href="/settings">
              <Button variant="outline" size="sm">
                Modifier le profil
              </Button>
            </Link>
          )}
        </div>

        <p className="mt-4 text-xs text-zinc-400">
          Membre depuis{" "}
          {new Date(profile.created_at).toLocaleDateString("fr-TN", {
            month: "long",
            year: "numeric",
          })}
        </p>

        {profile.bio && (
          <p className="mt-4 max-w-2xl leading-relaxed text-zinc-600">{profile.bio}</p>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {profile.role === "organization" ? (
            <>
              <StatBox value={badge_stats.events_created} label="Actions créées" />
              <StatBox value={badge_stats.volunteers_reached} label="Bénévoles mobilisés" />
              <StatBox value={badges_earned} label="Badges obtenus" />
            </>
          ) : (
            <>
              <StatBox value={badge_stats.actions_joined} label="Actions rejointes" />
              <StatBox value={badges_earned} label="Badges obtenus" />
              <StatBox value={ROLE_LABELS[profile.role] ?? profile.role} label="Rôle" />
            </>
          )}
        </div>

        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Badges</h2>
              <p className="text-xs text-zinc-500">
                Attribués automatiquement selon votre activité. Le niveau le plus
                haut atteint est affiché.
              </p>
            </div>
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-600">
              {badges_earned} / {badge_tracks.length} obtenus
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {badge_tracks.map((track) => (
              <BadgeTrackCard key={track.slug} track={track} />
            ))}
          </div>
        </section>

        {recent_events.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Actions récentes</h2>
            <div className="space-y-3">
              {recent_events.map((r) => {
                const evt = r.events;
                if (!evt) return null;
                return (
                  <Link key={r.event_id} href={`/events/${evt.id}`} className="group block">
                    <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-3 transition-all hover:border-red-200 hover:shadow-md">
                      {evt.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={evt.image_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-lg font-bold text-white">
                          {evt.title.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900 group-hover:text-red-700">
                          {evt.title}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatEventDate(evt.start_at)}
                          {evt.city && ` · ${evt.city}`}
                        </p>
                      </div>
                      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-zinc-300" strokeWidth="2" strokeLinecap="round">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <div className="h-16" />
    </Layout>
  );
}

function StatBox({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-sm">
      <p className="text-3xl font-extrabold tabular-nums text-red-600">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}




