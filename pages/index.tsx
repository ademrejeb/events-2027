import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import SearchBar from "@/components/SearchBar";
import ActionsExplorer from "@/components/ActionsExplorer";
import { useAllEvents } from "@/lib/use-events";
import { Button, Container, Skeleton, Stack, Text } from "@adem.rejeb/ui";

const EventMap = dynamic(() => import("@/components/EventMap"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[380px] animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100"
      aria-label="Chargement de la carte"
    />
  ),
});

export default function Home() {
  const router = useRouter();
  const { events, total, loading, error, reload } = useAllEvents();

  const urlQuery =
    router.isReady && typeof router.query.q === "string" ? router.query.q : "";

  function scrollToActions() {
    const target = document.getElementById("evenements");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function handleHeroSearch(value: string) {
    const q = value.trim();
    router.replace(
      { pathname: "/", query: q ? { q } : {} },
      undefined,
      { shallow: true, scroll: false },
    );
    scrollToActions();
  }

  const list = events ?? [];
  const cities = new Set(
    list.flatMap((event) => (event.city ? [event.city.toLowerCase()] : [])),
  ).size;
  const volunteers = list.reduce(
    (sum, event) => sum + (event.volunteer_count ?? 0),
    0,
  );
  const mappable = list.filter((event) => event.lat != null && event.lng != null);


  return (
    <Layout>
      <section className="relative overflow-hidden border-b border-red-100/70 bg-gradient-to-b from-rose-50 via-white to-white">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(220,38,38,0.16)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-red-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 top-40 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
        <Container>
          <div className="relative grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-20">
            <Stack gap={6} className="yl-rise">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-red-200 bg-white/80 px-3 py-1 text-xs font-semibold text-red-700 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                Plateforme de bénévolat tunisienne
              </span>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                Ensemble, tendons
                <br />
                <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                  la main du bien.
                </span>
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-zinc-600">
                Trouvez ou organisez des actions solidaires près de chez vous :
                campagnes de nettoyage, actions Ramadan, événements scolaires et
                œuvres de charité.
              </p>
              <Stack direction="row" gap={3} wrap>
                <Button variant="primary" size="lg" onClick={scrollToActions}>
                  Découvrir les actions
                </Button>
                <Link href="/signup">
                  <Button variant="outline" size="lg">
                    Devenir organisateur
                  </Button>
                </Link>
              </Stack>
              <div style={{ maxWidth: 460 }}>
                <SearchBar onSearch={handleHeroSearch} />
              </div>
            </Stack>
            {loading && list.length === 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Skeleton height={128} />
                </div>
                <Skeleton height={96} />
                <Skeleton height={96} />
              </div>
            )}
            {!loading && list.length > 0 && (
              <div className="yl-rise yl-rise-2 grid grid-cols-2 gap-4">
                <div className="relative col-span-2 overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-600 to-orange-500 p-6 text-white shadow-xl shadow-red-200/80 ring-1 ring-red-500/20">
                  <span className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/15" />
                  <span className="pointer-events-none absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-white/10" />
                  <p className="relative text-4xl font-extrabold tabular-nums">
                    {total || list.length}
                  </p>
                  <p className="relative mt-1 text-sm text-white/85">
                    actions solidaires à venir
                  </p>
                </div>
                <div className="group rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg hover:shadow-red-100/60">
                  <p className="text-3xl font-extrabold tabular-nums text-zinc-900">
                    {cities}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">villes concernées</p>
                  <span className="mt-4 block h-1 w-8 rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-300 group-hover:w-12" />
                </div>
                <div className="group rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg hover:shadow-red-100/60">
                  <p className="text-3xl font-extrabold tabular-nums text-zinc-900">
                    {volunteers}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">bénévoles sur ces actions</p>
                  <span className="mt-4 block h-1 w-8 rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-300 group-hover:w-12" />
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-600">
            Simple et solidaire
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
            Comment ça marche
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-zinc-500">
            Rejoindre une action solidaire en Tunisie n&rsquo;a jamais été aussi simple.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Découvrez",
              text: "Parcourez les actions près de chez vous sur la carte ou par catégorie.",
              icon: "M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
            },
            {
              step: "02",
              title: "Rejoignez",
              text: "Inscrivez-vous en quelques secondes, sans compte obligatoire, et invitez vos proches.",
              icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.9",
            },
            {
              step: "03",
              title: "Créez l'impact",
              text: "Participez, partagez les résultats et soutenez les organisations de votre choix.",
              icon: "M12 21s-7-4.35-9.5-8.5C.8 9.7 2 6 5.5 6c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3C17 6 18.2 9.7 16.5 12.5 14 16.65 12 21 12 21z",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="group relative rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl hover:shadow-red-100/60"
            >
              <span className="absolute right-6 top-5 text-4xl font-extrabold text-red-100 transition-colors duration-300 group-hover:text-red-200">
                {s.step}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/25 transition-transform duration-300 group-hover:scale-105">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={s.icon} />
                </svg>
              </span>
              <h3 className="mt-5 text-lg font-bold text-zinc-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-3xl border border-red-100 bg-gradient-to-r from-red-50 to-orange-50 p-8 shadow-sm">
          <span className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/60" />
          <span className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-orange-200/30 blur-2xl" />
          <div className="relative">
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900">
              Des organisateurs vérifiés
            </h2>
            <p className="mt-1 max-w-xl text-sm text-zinc-600">
              Associations, charities et initiatives locales : parcourez l&rsquo;annuaire
              des organisations approuvées et découvrez leurs actions.
            </p>
          </div>
          <Link href="/organizations" className="relative">
            <Button variant="primary" className="shadow-lg shadow-red-500/20">
              Explorer l&rsquo;annuaire
            </Button>
          </Link>
        </div>
      </section>

      {(loading || mappable.length > 0) && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Text as="h2" weight="bold" size="xl">
                Carte des actions
              </Text>
              <Text tone="muted" size="sm">
                {loading
                  ? "Chargement des actions géolocalisées…"
                  : `${mappable.length} action${mappable.length > 1 ? "s" : ""} géolocalisée${mappable.length > 1 ? "s" : ""} en Tunisie — les couleurs indiquent la catégorie.`}
              </Text>
            </div>
            <Link
              href="/#evenements"
              className="text-sm font-semibold text-red-700 transition-colors hover:text-red-800"
            >
              Voir la liste
            </Link>
          </div>
          {loading ? (
            <div className="h-[380px] animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100" />
          ) : (
            <EventMap
              events={mappable.map((e) => ({
                id: e.id,
                title: e.title,
                city: e.city,
                lat: e.lat,
                lng: e.lng,
                start_at: e.start_at,
                category_slug: e.event_categories.slug,
                category_name: e.event_categories.name,
              }))}
              height="380px"
            />
          )}
        </section>
      )}

      <section id="evenements" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20">
        <Stack gap={2}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-600">
            Agenda solidaire
          </p>
          <Text as="h2" weight="bold" size="xl">
            Actions à venir
          </Text>
          <Text tone="muted" size="sm">
            Recherchez parmi toutes les actions publiées, puis filtrez par catégorie
            ou par date.
          </Text>
        </Stack>

        <ActionsExplorer
          key={urlQuery}
          events={events}
          loading={loading}
          error={error}
          onRetry={reload}
          initialQuery={urlQuery}
        />
      </section>
    </Layout>
  );
}
