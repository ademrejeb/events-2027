import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import { useSession } from "@/lib/session";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { Alert, Badge, Button, Container, Input, Textarea } from "@adem.rejeb/ui";

const EventMap = dynamic(() => import("@/components/EventMap"), { ssr: false });

type EventDetail = {
  id: string; org_id: string; title: string; description: string | null; location: string | null; city: string | null;
  start_at: string; end_at: string | null; max_volunteers: number | null; status: string; image_url: string | null;
  lat: number | null; lng: number | null;
  locations?: { label?: string; lat: number; lng: number }[] | null;
  before_image_url?: string | null;
  after_image_url?: string | null;
  gallery_urls?: string[] | null;
  organizations: { name: string; type: string; verified: boolean };
  event_categories: { name: string; slug: string };
};
type DetailResponse = {
  event: EventDetail;
  volunteer_count: number;
  participant_count: number;
  total_count?: number;
  joined?: boolean;
  registered?: boolean;
  can_manage?: boolean;
};

const REGISTRATION_KEY = "yl:registered-events";

function hasRememberedRegistration(eventId: string): boolean {
  try {
    const raw = window.localStorage.getItem(REGISTRATION_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) && list.includes(eventId);
  } catch {
    return false;
  }
}

function rememberRegistration(eventId: string): void {
  try {
    const raw = window.localStorage.getItem(REGISTRATION_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const list = Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
    if (!list.includes(eventId)) list.push(eventId);
    window.localStorage.setItem(REGISTRATION_KEY, JSON.stringify(list.slice(-100)));
    window.dispatchEvent(new Event("yl:registration"));
  } catch {
    return;
  }
}

function subscribeRegistration(callback: () => void): () => void {
  window.addEventListener("yl:registration", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("yl:registration", callback);
    window.removeEventListener("storage", callback);
  };
}

export default function EventDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: sessionLoading } = useSession();

  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pSkills, setPSkills] = useState("");
  const [pMessage, setPMessage] = useState("");
  const [pPrivacy, setPPrivacy] = useState(false);
  const [participating, setParticipating] = useState(false);
  const [participated, setParticipated] = useState(false);
  const remembered = useSyncExternalStore(
    subscribeRegistration,
    () => typeof id === "string" && hasRememberedRegistration(id),
    () => false,
  );

  useEffect(() => {
    if (typeof id !== "string") return;
    let cancelled = false;
    fetch(`/api/events/${id}`)
      .then((res) => res.json())
      .then((d) => {
        if (cancelled) return;
        setNow(Date.now());
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => !cancelled && setError("Impossible de charger l'événement."));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function toggleJoin() {
    if (!data) return;
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${id}/volunteer`, {
        method: data.joined ? "DELETE" : "POST",
      });
      const d = await res.json();
      if (!res.ok) {
        setActionError(d.error ?? "Une erreur est survenue.");
        return;
      }
      const fresh = await fetch(`/api/events/${id}`, { cache: "no-store" });
      const freshData = await fresh.json();
      if (!freshData.error) setData(freshData);
    } catch {
      setActionError("Une erreur est survenue. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function submitParticipation(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    if (!pPrivacy) {
      setActionError("Veuillez accepter la politique de confidentialité.");
      return;
    }
    setParticipating(true);
    try {
      const res = await fetch(`/api/events/${id}/participate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: pName,
          phone: pPhone,
          email: pEmail,
          skills: pSkills,
          message: pMessage,
          privacy_accepted: pPrivacy,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.already_registered) {
          setParticipated(true);
          rememberRegistration(id as string);
        }
        setActionError(d.error ?? "Une erreur est survenue.");
        return;
      }
      setParticipated(true);
      rememberRegistration(id as string);
      // Refresh the authoritative counts immediately after registering.
      const fresh = await fetch(`/api/events/${id}`, { cache: "no-store" });
      if (fresh.ok) {
        const freshData = await fresh.json();
        if (!freshData.error) setData(freshData);
      }
    } catch {
      setActionError("Une erreur est survenue. Réessayez.");
    } finally {
      setParticipating(false);
    }
  }

  if (error || typeof id !== "string") {
    return (
      <Layout>
        <Container>
          <Alert variant="danger">{error ?? "Événement introuvable."}</Alert>
        </Container>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="h-72 w-full animate-pulse bg-zinc-200 sm:h-96" />
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="h-6 w-1/2 animate-pulse rounded bg-zinc-200" />
              <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100" />
              <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
            </div>
            <div className="h-80 animate-pulse rounded-3xl bg-zinc-100" />
          </div>
        </div>
      </Layout>
    );
  }

  const { event } = data;
  const totalRegistered =
    data.total_count ?? data.volunteer_count + data.participant_count;
  const full =
    event.max_volunteers != null && totalRegistered >= event.max_volunteers;
  const started = now > 0 && new Date(event.start_at).getTime() <= now;
  const open = event.status === "published" && !full && !started;
  const alreadyRegistered = participated || remembered || !!data.registered;

  const points = [
    ...(event.lat != null && event.lng != null
      ? [{ id: event.id, title: event.title, city: event.city, lat: event.lat, lng: event.lng, start_at: event.start_at }]
      : []),
    ...(event.locations ?? [])
      .filter((l) => l && typeof l.lat === "number" && typeof l.lng === "number")
      .map((l, i) => ({ id: `${event.id}-${i}`, title: l.label || `Lieu ${i + 1}`, city: event.city, lat: l.lat, lng: l.lng, start_at: event.start_at })),
  ];

  const progress =
    event.max_volunteers != null
      ? Math.min(100, Math.round((totalRegistered / event.max_volunteers) * 100))
      : null;

  return (
    <Layout>
      {/* Hero */}
      <div className="relative h-72 w-full overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-orange-600 sm:h-96">
        {event.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.image_url} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-4 pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" size="sm">
                {event.event_categories.name}
              </Badge>
              {event.organizations.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-white" aria-hidden="true">
                    <path d="M10 1l2.4 1.7 2.9-.2 1 2.8 2.4 1.7-1 2.8 1 2.8-2.4 1.7-1 2.8-2.9-.2L10 19l-2.4-1.7-2.9.2-1-2.8L1.3 13l1-2.8-1-2.8 2.4-1.7 1-2.8 2.9.2zM9 13l4.5-4.5-1.4-1.4L9 10.2 7.4 8.6 6 10z" />
                  </svg>
                  Organisateur vérifié
                </span>
              )}
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              {event.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {data.can_manage ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3">
            <p className="text-sm font-medium text-red-800">
              Vous gérez cette action.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/events/${event.id}/edit`}>
                <Button size="sm" variant="outline">
                  Modifier
                </Button>
              </Link>
              <Link href={`/organizations/${event.org_id}/dashboard`}>
                <Button size="sm" variant="ghost">
                  Tableau de bord
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main */}
          <div className="space-y-8 lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              {[
                `${formatEventDate(event.start_at)}${event.end_at ? ` → ${formatEventDate(event.end_at)}` : ""}`,
                formatEventTime(event.start_at),
                event.city,
                event.location,
              ]
                .filter(Boolean)
                .map((chip, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600"
                  >
                    {chip}
                  </span>
                ))}
            </div>

            {event.description && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-zinc-900">À propos</h2>
                <p className="whitespace-pre-line leading-relaxed text-zinc-600">
                  {event.description}
                </p>
              </section>
            )}

            {(event.before_image_url || event.after_image_url) && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-zinc-900">
                  Avant / Après
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: "Avant", url: event.before_image_url, color: "bg-amber-500" },
                    { label: "Après", url: event.after_image_url, color: "bg-green-600" },
                  ]
                    .filter((p) => p.url)
                    .map((p) => (
                      <figure key={p.label} className="overflow-hidden rounded-2xl border border-zinc-200">
                        <div className="relative h-56">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url as string} alt={p.label} className="h-full w-full object-cover" />
                          <span className={`absolute left-3 top-3 rounded-full ${p.color} px-3 py-1 text-xs font-semibold text-white`}>
                            {p.label}
                          </span>
                        </div>
                      </figure>
                    ))}
                </div>
              </section>
            )}

            {points.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-zinc-900">Localisation</h2>
                <div className="overflow-hidden rounded-2xl border border-zinc-200">
                  <EventMap events={points} center={[points[0].lat, points[0].lng]} height="320px" />
                </div>
              </section>
            )}

            {totalRegistered > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-zinc-900">
                  Participation
                </h2>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <p className="text-3xl font-extrabold tabular-nums text-zinc-900">
                    {totalRegistered}
                  </p>
                  <p className="text-sm text-zinc-500">
                    bénévole{totalRegistered > 1 ? "s" : ""} inscrit
                    {totalRegistered > 1 ? "s" : ""} à cette action
                  </p>
                  <p className="mt-3 text-xs text-zinc-400">
                    Chaque inscription compte pour une personne. Pour protéger la vie
                    privée des participants, la liste nominative n&rsquo;est pas
                    publique.
                  </p>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-extrabold tabular-nums text-zinc-900">
                    {totalRegistered}
                  </p>
                  <p className="text-sm text-zinc-500">
                    inscrit{totalRegistered > 1 ? "s" : ""}
                    {event.max_volunteers != null ? ` / ${event.max_volunteers}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    full
                      ? "bg-zinc-100 text-zinc-600"
                      : open
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {full ? "Complet" : open ? "Ouvert" : started ? "Terminé" : "Fermé"}
                </span>
              </div>

              {progress !== null && (
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              <div className="mt-6">
                {!user && !sessionLoading ? (
                  alreadyRegistered ? (
                    <div className="rounded-2xl bg-green-50 p-4 text-sm text-green-700">
                      Merci ! Votre participation a été enregistrée. Vous ne pouvez
                      participer qu&rsquo;une seule fois à cette action.
                    </div>
                  ) : (
                    <form onSubmit={submitParticipation} className="space-y-3">
                      <p className="text-sm font-medium text-zinc-700">
                        Rejoindre sans compte
                      </p>
                      <Input
                        aria-label="Nom complet"
                        placeholder="Nom complet *"
                        required
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                      />
                      <Input
                        aria-label="Téléphone"
                        placeholder="Téléphone *"
                        required
                        value={pPhone}
                        onChange={(e) => setPPhone(e.target.value)}
                      />
                      <Input
                        type="email"
                        aria-label="Email"
                        placeholder="Email *"
                        required
                        value={pEmail}
                        onChange={(e) => setPEmail(e.target.value)}
                      />
                      <Textarea
                        aria-label="Compétences utiles"
                        placeholder="Compétences utiles (optionnel)"
                        value={pSkills}
                        onChange={(e) => setPSkills(e.target.value)}
                      />
                      <Textarea
                        aria-label="Message"
                        placeholder="Message (optionnel)"
                        value={pMessage}
                        onChange={(e) => setPMessage(e.target.value)}
                      />
                      <label className="flex items-start gap-2 text-xs text-zinc-500">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 accent-red-600"
                          checked={pPrivacy}
                          onChange={(e) => setPPrivacy(e.target.checked)}
                        />
                        <span>
                          J&rsquo;accepte que mes coordonnées soient transmises à
                          l&rsquo;organisation pour la coordination de l&rsquo;action.
                        </span>
                      </label>
                      <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={participating}
                        size="lg"
                      >
                        Participer
                      </Button>
                    </form>
                  )
                ) : data.joined ? (
                  <Button variant="outline" fullWidth onClick={toggleJoin} loading={busy}>
                    Se désinscrire
                  </Button>
                ) : alreadyRegistered ? (
                  <div className="rounded-2xl bg-green-50 p-4 text-sm text-green-700">
                    Vous êtes déjà inscrit(e) à cette action.
                  </div>
                ) : open ? (
                  <Button variant="primary" fullWidth onClick={toggleJoin} loading={busy} size="lg">
                    Participer en tant que bénévole
                  </Button>
                ) : started ? (
                  <p className="text-center text-sm text-zinc-500">Cet événement a commencé</p>
                ) : full ? (
                  <p className="text-center text-sm text-zinc-500">Complet</p>
                ) : (
                  <p className="text-center text-sm text-zinc-500">Inscriptions fermées</p>
                )}

                {actionError && (
                  <div className="mt-3">
                    <Alert variant="danger">{actionError}</Alert>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-zinc-100 pt-4">
                <p className="text-xs text-zinc-400">Organisé par</p>
                <p className="text-sm font-semibold text-zinc-800">
                  {event.organizations.name}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
