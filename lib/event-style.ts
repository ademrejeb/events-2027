export type EventCategoryStyle = {
  slug: string
  label: string
  color: string
  soft: string
  icon: string[]
}

const CATEGORY_STYLES: Record<string, EventCategoryStyle> = {
  cleaning: {
    slug: "cleaning",
    label: "Nettoyage",
    color: "#0f766e",
    soft: "rgba(15, 118, 110, 0.16)",
    icon: [
      "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z",
      "M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
    ],
  },
  ramadan: {
    slug: "ramadan",
    label: "Ramadan",
    color: "#6d28d9",
    soft: "rgba(109, 40, 217, 0.16)",
    icon: ["M20 15.2A8.6 8.6 0 0 1 8.8 4 8.6 8.6 0 1 0 20 15.2z"],
  },
  school: {
    slug: "school",
    label: "École",
    color: "#b45309",
    soft: "rgba(180, 83, 9, 0.16)",
    icon: [
      "M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6.5A2.5 2.5 0 0 1 4 17.5z",
      "M8 8h8M8 12h6",
    ],
  },
  charity: {
    slug: "charity",
    label: "Charité",
    color: "#be123c",
    soft: "rgba(190, 18, 60, 0.16)",
    icon: [
      "M12 20.5S4.8 16.2 3 12.2C1.7 9.4 3.4 6.2 6.5 6.2c1.7 0 3 1 3.8 2.1.8-1.1 2.1-2.1 3.8-2.1 3.1 0 4.8 3.2 3.5 6-1.8 4-9 8.3-9 8.3z",
    ],
  },
  health: {
    slug: "health",
    label: "Santé",
    color: "#0369a1",
    soft: "rgba(3, 105, 161, 0.16)",
    icon: [
      "M12 21s-7-4.35-9.5-8.5C.8 9.7 2 6 5.5 6c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3C17 6 18.2 9.7 16.5 12.5 14 16.65 12 21 12 21z",
      "M3 12h4l1.5-2.5L11 15l2-5 1.5 2H17",
    ],
  },
  environment: {
    slug: "environment",
    label: "Environnement",
    color: "#15803d",
    soft: "rgba(21, 128, 61, 0.16)",
    icon: [
      "M20 4c-8 0-14 4-14 10a6 6 0 0 0 6 6c6 0 8-6 8-16z",
      "M4 21c2.5-5.5 6.5-8.5 11-10",
    ],
  },
}

export const EVENT_CATEGORY_STYLES = CATEGORY_STYLES

export const FALLBACK_CATEGORY_STYLE: EventCategoryStyle = {
  slug: "other",
  label: "Autre",
  color: "#475569",
  soft: "rgba(71, 85, 105, 0.16)",
  icon: ["M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z", "M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
}

export function eventCategoryStyle(slug: string | null | undefined): EventCategoryStyle {
  return (slug && CATEGORY_STYLES[slug]) || FALLBACK_CATEGORY_STYLE
}
