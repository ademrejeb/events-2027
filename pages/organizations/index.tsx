import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "@/components/Layout";
import { Badge, Button, Card, EmptyState, Input, Skeleton, Stack } from "@adem.rejeb/ui";

type Org = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  city: string | null;
  verified: boolean;
  website: string | null;
};

const TYPES = [
  { id: "", label: "Tous" },
  { id: "association", label: "Associations" },
  { id: "charity", label: "Caritatif" },
  { id: "ngo", label: "ONG" },
  { id: "club", label: "Clubs" },
  { id: "government", label: "Public" },
  { id: "individual", label: "Initiatives" },
] as const;

export default function OrganizationsDirectory() {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (type) params.set("type", type);
        const r = await fetch(`/api/organizations?${params}`, {
          signal: controller.signal,
        });
        if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
        const data = await r.json();
        if (!controller.signal.aborted) {
          setOrgs(data.organizations ?? []);
          setError(null);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      }
    })();
    return () => controller.abort();
  }, [q, type]);

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <Stack gap={8}>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Organisateurs vérifiés
            </h1>
            <p className="mt-2 max-w-2xl text-zinc-600">
              Découvrez les associations, ONG et initiatives solidaires vérifiées par
              Yed Lkhir. Chaque organisation est examinée avant publication.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Rechercher une organisation"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <Button
                  key={t.id}
                  size="sm"
                  variant={type === t.id ? "primary" : "outline"}
                  onClick={() => setType(t.id)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!orgs && !error ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={140} />
              ))}
            </div>
          ) : null}

          {orgs && orgs.length === 0 ? (
            <EmptyState
              title="Aucune organisation"
              description="Aucune organisation vérifiée ne correspond à votre recherche."
            />
          ) : null}

          {orgs && orgs.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {orgs.map((org) => (
                <Link key={org.id} href={`/organizations/${org.id}`}>
                  <Card interactive>
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-xl font-extrabold text-white">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate font-semibold text-zinc-900">
                            {org.name}
                          </h2>
                          {org.verified && <Badge variant="info">✓</Badge>}
                        </div>
                        <p className="mt-1 text-xs capitalize text-zinc-500">
                          {org.type}
                          {org.city ? ` · ${org.city}` : ""}
                        </p>
                        {org.description && (
                          <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
                            {org.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : null}
        </Stack>
      </div>
    </Layout>
  );
}
