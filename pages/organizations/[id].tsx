import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import EventCard, { type EventListItem } from "@/components/EventCard";
import { Button } from "@adem.rejeb/ui";

type Org = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  city: string | null;
  verified: boolean;
  website: string | null;
  public_email: string | null;
  public_phone: string | null;
  rib_holder: string | null;
  bank_name: string | null;
  rib: string | null;
  donation_instructions: string | null;
  donation_url: string | null;
};

export default function OrgProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [org, setOrg] = useState<Org | null>(null);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `/api/organizations/${encodeURIComponent(id)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Organisation introuvable.");
        if (controller.signal.aborted) return;
        setOrg(data.organization as Org);
        setEvents((data.events as EventListItem[]) ?? []);
        setError(null);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [id]);

  async function copyRib() {
    if (!org?.rib) return;
    try {
      await navigator.clipboard.writeText(org.rib);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="h-56 animate-pulse rounded-3xl bg-zinc-100" />
        </div>
      </Layout>
    );
  }

  if (!org) {
    return (
      <Layout>
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Organisation introuvable</h1>
          {error && <p className="mt-2 text-sm text-zinc-500">{error}</p>}
        </div>
      </Layout>
    );
  }

  const hasDonation = !!(org.rib || org.donation_url || org.donation_instructions);
  const initial = org.name.charAt(0).toUpperCase();

  return (
    <Layout>
      <div className="relative h-48 w-full bg-gradient-to-br from-red-600 via-red-700 to-orange-600">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_20%_20%,rgba(255,255,255,.3),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(255,255,255,.25),transparent_40%)]" />
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div className="-mt-16 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br from-red-500 to-orange-500 text-5xl font-extrabold text-white shadow-lg">
            {initial}
          </div>
          <div className="pb-2">
            <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold capitalize text-red-700">
              {org.type}
            </span>
            {org.verified && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                ✓ Vérifié
              </span>
            )}
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
              {org.name}
            </h1>
            {org.city && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                <svg viewBox="0 0 20 20" className="h-4 w-4 fill-red-500" aria-hidden="true">
                  <path d="M10 2a6 6 0 0 0-6 6c0 4.2 6 10 6 10s6-5.8 6-10a6 6 0 0 0-6-6zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
                </svg>
                {org.city}
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            {org.description && (
              <section>
                <h2 className="mb-3 text-lg font-semibold text-zinc-900">À propos</h2>
                <p className="whitespace-pre-line leading-relaxed text-zinc-600">
                  {org.description}
                </p>
              </section>
            )}

            <section>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">
                Actions publiées ({events.length})
              </h2>
              {events.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">
                  Aucune action publiée pour le moment.
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {events.map((ev) => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="lg:col-span-1">
            {hasDonation ? (
              <div className="sticky top-24 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                      <path d="M12 21s-7-4.35-9.5-8.5C.8 9.7 2 6 5.5 6c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3C17 6 18.2 9.7 16.5 12.5 14 16.65 12 21 12 21z" />
                    </svg>
                  </span>
                  <h2 className="text-lg font-semibold text-zinc-900">Soutenir</h2>
                </div>

                <div className="space-y-4">
                  {org.rib_holder && (
                    <div>
                      <p className="text-xs text-zinc-400">Bénéficiaire</p>
                      <p className="text-sm font-medium text-zinc-800">{org.rib_holder}</p>
                    </div>
                  )}
                  {org.bank_name && (
                    <div>
                      <p className="text-xs text-zinc-400">Banque</p>
                      <p className="text-sm font-medium text-zinc-800">{org.bank_name}</p>
                    </div>
                  )}
                  {org.rib && (
                    <div>
                      <p className="mb-1 text-xs text-zinc-400">RIB</p>
                      <div className="flex items-center gap-2 rounded-xl bg-zinc-50 p-3">
                        <code className="flex-1 break-all font-mono text-sm text-zinc-800">
                          {org.rib}
                        </code>
                        <Button size="sm" variant={copied ? "outline" : "primary"} onClick={copyRib}>
                          {copied ? "Copié !" : "Copier"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {org.donation_instructions && (
                    <p className="text-sm text-zinc-600">{org.donation_instructions}</p>
                  )}
                  {org.donation_url && (
                    <a
                      href={org.donation_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="block"
                    >
                      <Button variant="primary" fullWidth>
                        Lien de don officiel
                      </Button>
                    </a>
                  )}
                  <p className="border-t border-zinc-100 pt-3 text-xs text-zinc-400">
                    Les dons sont effectués en dehors de Yed Lkhir et gérés par l&rsquo;organisation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
                Cette organisation n&rsquo;a pas encore publié d&rsquo;informations de don.
              </div>
            )}
          </aside>
        </div>
      </div>
      <div className="h-16" />
    </Layout>
  );
}
