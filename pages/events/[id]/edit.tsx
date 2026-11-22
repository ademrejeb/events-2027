import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/components/Layout";
import EventForm, {
  emptyEventForm,
  type Category,
  type EventFormValues,
} from "@/components/EventForm";
import { useSession } from "@/lib/session";

type ApiEvent = {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  category_id: string;
  city: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  max_volunteers: number | null;
  status: string;
  image_url: string | null;
  before_images?: string[] | null;
  after_images?: string[] | null;
  lat?: number | null;
  lng?: number | null;
  locations?: { label?: string; lat: number; lng: number }[] | null;
  organizations?: { name: string; verified: boolean } | null;
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default function EditEvent() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading } = useSession();

  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [initial, setInitial] = useState<EventFormValues | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);


  useEffect(() => {
    if (loading || !router.isReady) return;
    if (!user) {
      router.replace(`/login?next=/events/${String(id)}/edit`);
      return;
    }
    if (typeof id !== "string") return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/events/${id}`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([data, catData]) => {
        if (cancelled) return;
        if (!data.can_manage) {
          router.replace(`/events/${id}`);
          return;
        }
        const ev: ApiEvent = data.event;
        setEvent(ev);
        if (!catData.error) setCategories(catData.categories ?? []);
        setInitial({
          ...emptyEventForm,
          org_id: ev.org_id,
          title: ev.title,
          description: ev.description ?? "",
          category_id: ev.category_id,
          city: ev.city ?? "",
          location: ev.location ?? "",
          start_at: toLocalInput(ev.start_at),
          end_at: toLocalInput(ev.end_at),
          max_volunteers: ev.max_volunteers ? String(ev.max_volunteers) : "",
          status: (
            ["draft", "published", "cancelled", "completed"].includes(ev.status)
              ? ev.status
              : "draft"
          ) as EventFormValues["status"],
          image_url: ev.image_url,
          before_images: ev.before_images ?? [],
          after_images: ev.after_images ?? [],
          locations: (ev.locations ?? []).map((l, i) => ({
            label: l.label ?? `Lieu ${i + 1}`,
            lat: l.lat,
            lng: l.lng,
          })),
          lat: typeof ev.lat === "number" ? String(ev.lat) : "",
          lng: typeof ev.lng === "number" ? String(ev.lng) : "",
        });
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger cette action.");
      });
    return () => {
      cancelled = true;
    };
  }, [id, user, loading, router]);

  if (loading || !user || !initial || !event) {
    return (
      <Layout>
        {error ? (
          <div className="mx-auto max-w-5xl px-4 py-20 text-center">
            <p className="text-zinc-500">{error}</p>
            <Link href="/" className="mt-4 inline-block text-red-600 hover:underline">
              Retour
            </Link>
          </div>
        ) : null}
      </Layout>
    );
  }

  async function handleSubmit(values: EventFormValues) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${event!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title.trim(),
          description: values.description,
          category_id: values.category_id,
          location: values.location,
          city: values.city.trim(),
          start_at: toIso(values.start_at),
          end_at: values.end_at ? toIso(values.end_at) : null,
          max_volunteers: values.max_volunteers ? Number(values.max_volunteers) : null,
          status: values.status,
          image_url: values.image_url,
          before_images: values.before_images,
          after_images: values.after_images,
          locations: values.locations,
          lat: values.lat ? Number(values.lat) : null,
          lng: values.lng ? Number(values.lng) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible d'enregistrer les modifications.");
        return;
      }
      router.push(`/events/${event!.id}`);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <Link
          href={`/events/${event.id}`}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          ← Retour à l&rsquo;action
        </Link>
        <header className="mt-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
            Modifier l&rsquo;action
          </h1>
          <p className="mt-2 max-w-xl text-zinc-500">
            {event.organizations?.name ? `${event.organizations.name} · ` : ""}
            Les bénévoles déjà inscrits verront les mises à jour.
          </p>
        </header>

        <div className="mt-8">
          <EventForm
            mode="edit"
            initial={initial}
            categories={categories}
            orgs={[
              {
                id: event.org_id,
                name: event.organizations?.name ?? "Votre organisation",
                verified: !!event.organizations?.verified,
              },
            ]}
            submitting={submitting}
            error={error}
            onSubmit={handleSubmit}
            cancelHref={`/events/${event.id}`}
          />
        </div>
      </div>
    </Layout>
  );
}
