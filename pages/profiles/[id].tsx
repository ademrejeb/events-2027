import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/components/Layout";
import { useSession } from "@/lib/session";
import { formatEventDate } from "@/lib/format";
import { BADGE_TIER_LABEL, BADGE_TIER_STYLE, type BadgeIcon, type BadgeTrack } from "@/lib/badges";
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

function BadgeTrackCard({ track }: { track: BadgeTrack }) {
  const tierStyle = track.tier ? BADGE_TIER_STYLE[track.tier] : null;
  const progress = track.next
    ? Math.min(100, Math.round((track.value / track.next.threshold) * 100))
    : 100;

  return (
    <div
      className={
        "rounded-2xl border bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md " +
        (track.tier ? "border-zinc-200" : "border-dashed border-zinc-200")
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ring-4 " +
            (tierStyle
              ? `${tierStyle.medallion} ${tierStyle.ring}`
              : "from-zinc-100 via-white to-zinc-200 text-zinc-400 ring-zinc-100")
          }
        >
          <BadgeTrackIcon icon={track.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900">{track.label}</p>
          <span
            className={
              "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
              (tierStyle
                ? tierStyle.chip
                : "border-zinc-200 bg-zinc-50 text-zinc-400")
            }
          >
            {track.tier ? BADGE_TIER_LABEL[track.tier] : "À débloquer"}
          </span>
          <p className="mt-1 text-xs text-zinc-500">{track.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-extrabold tabular-nums text-zinc-900">
            {track.value}
          </p>
          <p className="text-[10px] text-zinc-400">{track.unit}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={"h-full rounded-full " + (tierStyle ? tierStyle.bar : "bg-zinc-300")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-500">
          {track.next
            ? `${track.value} / ${track.next.threshold} ${track.unit} pour ${BADGE_TIER_LABEL[track.next.tier]}`
            : "Niveau maximum atteint"}
        </p>
      </div>
    </div>
  );
}

function BadgeTrackIcon({ icon }: { icon: BadgeIcon }) {
  const paths: Record<BadgeIcon, string[]> = {
    clock: ["M12 7v5l3 2", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"],
    sparkles: [
      "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z",
      "M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
    ],
    users: [
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
      "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
      "M22 21v-2a4 4 0 0 0-3-3.9",
    ],
    bolt: ["M13 2 4 14h7l-1 8 9-12h-7z"],
  };
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6 fill-none stroke-current"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[icon].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
