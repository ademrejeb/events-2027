import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/components/Layout";
import EventForm, {
  emptyEventForm,
  type Category,
  type EventFormValues,
  type OrgOption,
} from "@/components/EventForm";
import { useSession } from "@/lib/session";
import { Skeleton } from "@adem.rejeb/ui";

function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default function CreateEvent() {
  const router = useRouter();
  const { user, account, loading } = useSession();

  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [initial, setInitial] = useState<EventFormValues | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canCreate =
    account?.organizer_status === "approved" || account?.is_admin === true;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/events/new");
      return;
    }
    if (!canCreate) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    Promise.all([
      fetch("/api/organizations/mine").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([orgData, catData]) => {
        if (cancelled) return;
        const list: OrgOption[] = (orgData.organizations ?? []).map(
          (o: { id: string; name: string; verified: boolean }) => ({
            id: o.id,
            name: o.name,
            verified: !!o.verified,
          }),
        );
        setOrgs(list);
        if (!catData.error) setCategories(catData.categories ?? []);
        setInitial({
          ...emptyEventForm,
          org_id: list[0]?.id ?? "",
        });
      })
      .catch(() => {
        if (!cancelled) setFormError("Impossible de charger les données.");
      });
    return () => {
      cancelled = true;
    };
  }, [user, canCreate, loading, router]);

  if (loading || !user || !canCreate || !initial) {
    return (
      <Layout>
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
          <Skeleton height={28} width="45%" />
          <div className="mt-6 space-y-4">
            <Skeleton height={56} />
            <Skeleton height={140} />
            <Skeleton height={56} />
          </div>
        </div>
      </Layout>
    );
  }

  async function handleSubmit(values: EventFormValues) {
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: values.org_id,
          title: values.title.trim(),
          description: values.description || undefined,
          category_id: values.category_id,
          location: values.location || undefined,
          city: values.city.trim() || undefined,
          start_at: toIso(values.start_at),
          end_at: toIso(values.end_at),
          max_volunteers: values.max_volunteers ? Number(values.max_volunteers) : undefined,
          status: values.status,
          image_url: values.image_url || undefined,
          before_images: values.before_images,
          after_images: values.after_images,
          locations: values.locations.length > 0 ? values.locations : undefined,
          lat: values.lat ? Number(values.lat) : undefined,
          lng: values.lng ? Number(values.lng) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Impossible de créer l'action.");
        return;
      }
      router.push(
        values.status === "draft"
          ? `/organizations/${values.org_id}/dashboard`
          : `/events/${data.event.id}`,
      );
    } catch {
      setFormError("Une erreur est survenue. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
          ← Retour
        </Link>
        <header className="mt-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
            Créer une action
          </h1>
          <p className="mt-2 max-w-xl text-zinc-500">
            Publiez une action solidaire, fixez le lieu et invitez des bénévoles.
            Vous pouvez l&rsquo;enregistrer en brouillon puis la publier plus tard.
          </p>
        </header>

        <div className="mt-10">
          <EventForm
            mode="create"
            initial={initial}
            categories={categories}
            orgs={orgs}
            submitting={submitting}
            error={formError}
            onSubmit={handleSubmit}
            cancelHref="/"
          />
        </div>
      </div>
    </Layout>
  );
}
