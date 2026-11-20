const dateFormatter = new Intl.DateTimeFormat("fr-TN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("fr-TN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatEventDate(iso: string) {
  return dateFormatter.format(new Date(iso));
}

export function formatEventTime(iso: string) {
  return timeFormatter.format(new Date(iso));
}
