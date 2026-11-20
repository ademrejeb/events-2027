import Link from "next/link";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { eventCategoryStyle } from "@/lib/event-style";

export type EventListItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  city: string | null;
  start_at: string;
  end_at: string | null;
  max_volunteers: number | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  organizations: {
    name: string;
    type: string;
    verified: boolean;
  };
  event_categories: {
    name: string;
    slug: string;
  };
  volunteer_count?: number;
  volunteers?: { count: number }[];
};

export default function EventCard({ event }: { event: EventListItem }) {
  const category = eventCategoryStyle(event.event_categories.slug);
  const volunteerCount =
    event.volunteer_count ?? event.volunteers?.[0]?.count ?? 0;
  const spotsLeft =
    event.max_volunteers != null ? event.max_volunteers - volunteerCount : null;
  const full = spotsLeft !== null && spotsLeft <= 0;

  return (
    <Link href={`/events/${event.id}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl hover:shadow-red-100/50">
        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-red-500 via-red-600 to-orange-500">
          {event.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.image_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg viewBox="0 0 48 48" className="h-14 w-14 opacity-80" aria-hidden="true">
                <defs>
                  <linearGradient id="cardHand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#ffe8dd" />
                  </linearGradient>
                </defs>
                <g fill="url(#cardHand)">
                  <path d="M13 24c0-5.5 2.8-9.5 6.6-9.5 1.4 0 2.6 1.2 2.6 2.9V30c0 3-1.9 5.3-4.6 5.3C14.2 35.3 13 31.5 13 27z" />
                  <rect x="22" y="12" width="3.6" height="14" rx="1.8" />
                  <rect x="27" y="15" width="3.6" height="11" rx="1.8" />
                  <rect x="32" y="18" width="3.6" height="8" rx="1.8" />
                </g>
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <div className="absolute left-3 top-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[0.7rem] font-semibold shadow-sm"
              style={{ color: category.color }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {event.event_categories.name}
            </span>
          </div>
          {full && (
            <div className="absolute right-3 top-3 rounded-full bg-zinc-900/80 px-2.5 py-1 text-[0.65rem] font-semibold text-white">
              Complet
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0 fill-red-500" aria-hidden="true">
              <path d="M10 2a6 6 0 0 0-6 6c0 4.2 6 10 6 10s6-5.8 6-10a6 6 0 0 0-6-6zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
            </svg>
            <span className="truncate">
              {event.city || event.location || "Tunisie"}
            </span>
            <span className="ml-auto shrink-0 tabular-nums">
              {formatEventDate(event.start_at)} · {formatEventTime(event.start_at)}
            </span>
          </div>

          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-zinc-900 group-hover:text-red-700">
            {event.title}
          </h3>

          <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-3">
            <span className="flex items-center gap-1.5 text-sm text-zinc-600">
              {event.organizations.verified && (
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-red-500" aria-hidden="true">
                  <path d="M10 1l2.4 1.7 2.9-.2 1 2.8 2.4 1.7-1 2.8 1 2.8-2.4 1.7-1 2.8-2.9-.2L10 19l-2.4-1.7-2.9.2-1-2.8L1.3 13l1-2.8-1-2.8 2.4-1.7 1-2.8 2.9.2zM9 13l4.5-4.5-1.4-1.4L9 10.2 7.4 8.6 6 10z" />
                </svg>
              )}
              <span className="truncate">{event.organizations.name}</span>
            </span>
            <span className="shrink-0 text-xs font-medium text-zinc-500">
              {volunteerCount} bénévole{volunteerCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
