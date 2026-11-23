import {
  BADGE_TIER_LABEL,
  BADGE_TIER_STYLE,
  type BadgeIcon,
  type BadgeTrack,
} from "@/lib/badges";

/** One automatic badge track, with the reached tier and progress to the next. */
export default function BadgeTrackCard({ track }: { track: BadgeTrack }) {
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
              (tierStyle ? tierStyle.chip : "border-zinc-200 bg-zinc-50 text-zinc-400")
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
