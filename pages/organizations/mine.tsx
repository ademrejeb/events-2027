import { useEffect, useState } from "react";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { requireOrganizerPage } from "@/lib/page-auth";
import type { ProfileRow } from "@/lib/authz";
import Layout from "@/components/Layout";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  Stack,
} from "@adem.rejeb/ui";

type Org = {
  id: string;
  name: string;
  type: string;
  city: string | null;
  verified: boolean;
  status: string;
  role_in_org: string;
};

export const getServerSideProps: GetServerSideProps<{ profile: ProfileRow }> =
  async (ctx) => requireOrganizerPage(ctx);

export default function MySpace({ profile }: { profile: ProfileRow }) {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/organizations/mine")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
        return r.json();
      })
      .then((d) => setOrgs(d.organizations ?? []))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
        <Stack gap={8}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
                Mon espace organisateur
              </h1>
              <p className="mt-1 text-zinc-600">
                Bonjour {profile.full_name ?? "organisateur"}, gérez vos organisations
                et vos actions.
              </p>
            </div>
            <Link href="/organizations/new">
              <Button variant="outline" size="sm">
                + Nouvelle organisation
              </Button>
            </Link>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          {!orgs && !error ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} height={120} />
              ))}
            </div>
          ) : null}

          {orgs && orgs.length === 0 ? (
            <EmptyState
              title="Aucune organisation"
              description="Créez votre organisation pour commencer à publier des actions."
              actions={
                <Link href="/organizations/new">
                  <Button>Créer une organisation</Button>
                </Link>
              }
            />
          ) : null}

          {orgs && orgs.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {orgs.map((org) => (
                <Card key={org.id}>
                  <Stack gap={3}>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-zinc-900">{org.name}</h2>
                      {org.verified && <Badge variant="info">✓ Vérifié</Badge>}
                      <Badge variant="neutral">{org.role_in_org}</Badge>
                    </div>
                    <p className="text-sm capitalize text-zinc-500">
                      {org.type}
                      {org.city ? ` · ${org.city}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/organizations/${org.id}/dashboard`}>
                        <Button size="sm">Tableau de bord</Button>
                      </Link>
                      <Link href={`/organizations/${org.id}`}>
                        <Button size="sm" variant="outline">
                          Page publique
                        </Button>
                      </Link>
                    </div>
                  </Stack>
                </Card>
              ))}
            </div>
          ) : null}
        </Stack>
      </div>
    </Layout>
  );
}
