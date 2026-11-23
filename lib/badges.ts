/**
 * Automatic badge tracks.
 *
 * A badge is never granted by hand: every profile that reaches a threshold in
 * a track gets that tier. Only the highest tier reached per track is shown.
 * Thresholds are deliberately reachable (silver = first step) without making
 * diamond trivial.
 */
export type BadgeTier = "silver" | "gold" | "platinum" | "diamond";

export const BADGE_TIER_ORDER: BadgeTier[] = [
  "silver",
  "gold",
  "platinum",
  "diamond",
];

export const BADGE_TIER_LABEL: Record<BadgeTier, string> = {
  silver: "Argent",
  gold: "Or",
  platinum: "Platine",
  diamond: "Diamant",
};

/** Tailwind class fragments per tier; static strings so Tailwind emits them. */
export const BADGE_TIER_STYLE: Record<
  BadgeTier,
  { medallion: string; ring: string; chip: string; bar: string }
> = {
  silver: {
    medallion: "from-slate-100 via-white to-slate-300 text-slate-600",
    ring: "ring-slate-200",
    chip: "border-slate-200 bg-slate-50 text-slate-600",
    bar: "bg-slate-400",
  },
  gold: {
    medallion: "from-amber-100 via-yellow-50 to-amber-300 text-amber-700",
    ring: "ring-amber-200",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
  },
  platinum: {
    medallion: "from-teal-100 via-cyan-50 to-teal-300 text-teal-700",
    ring: "ring-teal-200",
    chip: "border-teal-200 bg-teal-50 text-teal-700",
    bar: "bg-teal-500",
  },
  diamond: {
    medallion: "from-violet-100 via-fuchsia-50 to-violet-300 text-violet-700",
    ring: "ring-violet-200",
    chip: "border-violet-200 bg-violet-50 text-violet-700",
    bar: "bg-violet-500",
  },
};

export type BadgeTrackSlug = "tenure" | "created" | "impact" | "momentum";
export type BadgeIcon = "clock" | "sparkles" | "users" | "bolt";

export type BadgeThreshold = { tier: BadgeTier; threshold: number };

export type BadgeTrack = {
  slug: BadgeTrackSlug;
  label: string;
  description: string;
  icon: BadgeIcon;
  unit: string;
  value: number;
  tier: BadgeTier | null;
  next: BadgeThreshold | null;
  thresholds: BadgeThreshold[];
};

export type BadgeStats = {
  tenureMonths: number;
  eventsCreated: number;
  volunteersReached: number;
  actionsJoined: number;
  momentum: number;
};

const TENURE_THRESHOLDS: number[] = [1, 6, 12, 24];
const CREATED_THRESHOLDS: number[] = [1, 5, 15, 40];
const IMPACT_ORG_THRESHOLDS: number[] = [3, 15, 50, 150];
const IMPACT_VOLUNTEER_THRESHOLDS: number[] = [1, 5, 15, 30];
const MOMENTUM_THRESHOLDS: number[] = [1, 3, 6, 12];

const tierThresholds = (values: number[]): BadgeThreshold[] =>
  values.map((threshold, index) => ({
    tier: BADGE_TIER_ORDER[index],
    threshold,
  }));

function buildTrack(
  base: Pick<BadgeTrack, "slug" | "label" | "description" | "icon" | "unit">,
  thresholds: number[],
  value: number,
): BadgeTrack {
  const tiers = tierThresholds(thresholds);
  const reached = tiers.filter((entry) => value >= entry.threshold);
  return {
    ...base,
    value,
    thresholds: tiers,
    tier: reached.length > 0 ? reached[reached.length - 1].tier : null,
    next: tiers.find((entry) => value < entry.threshold) ?? null,
  };
}

/**
 * Role-aware tracks:
 * - organizations are scored on events created and volunteers mobilised;
 * - everyone is scored on tenure and on activity from the last 90 days.
 */
export function buildBadgeTracks(role: string, stats: BadgeStats): BadgeTrack[] {
  const isOrganization = role === "organization";

  return [
    buildTrack(
      {
        slug: "tenure",
        label: "Ancienneté",
        description: "Temps passé sur Yed Lkhir depuis l’inscription.",
        icon: "clock",
        unit: "mois",
      },
      TENURE_THRESHOLDS,
      stats.tenureMonths,
    ),
    buildTrack(
      {
        slug: "created",
        label: "Créateur",
        description: "Actions solidaires créées par votre organisation.",
        icon: "sparkles",
        unit: "actions",
      },
      CREATED_THRESHOLDS,
      stats.eventsCreated,
    ),
    buildTrack(
      isOrganization
        ? {
            slug: "impact",
            label: "Impact",
            description: "Bénévoles mobilisés sur les actions de votre organisation.",
            icon: "users",
            unit: "bénévoles",
          }
        : {
            slug: "impact",
            label: "Engagement",
            description: "Actions solidaires rejointes.",
            icon: "users",
            unit: "actions",
          },
      isOrganization ? IMPACT_ORG_THRESHOLDS : IMPACT_VOLUNTEER_THRESHOLDS,
      isOrganization ? stats.volunteersReached : stats.actionsJoined,
    ),
    buildTrack(
      {
        slug: "momentum",
        label: "Élan",
        description: "Activité des 90 derniers jours.",
        icon: "bolt",
        unit: "actions",
      },
      MOMENTUM_THRESHOLDS,
      stats.momentum,
    ),
  ];
}

export function earnedBadgeCount(tracks: BadgeTrack[]): number {
  return tracks.filter((track) => track.tier !== null).length;
}
