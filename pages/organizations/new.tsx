import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import Layout from "@/components/Layout";
import { useSession } from "@/lib/session";
import { Alert, Button, FormField, Input, Skeleton, Stack, Text, Textarea } from "@adem.rejeb/ui";

type OrgType =
  | "association"
  | "charity"
  | "club"
  | "ngo"
  | "government"
  | "individual"
  | "other";

const ORG_TYPES: { id: OrgType; title: string; description: string }[] = [
  { id: "association", title: "Association", description: "Associations locales et régionales." },
  { id: "charity", title: "Caritatif", description: "Organismes d'aide et de bienfaisance." },
  { id: "ngo", title: "ONG", description: "Croissant Rouge, JCI, ONG internationales…" },
  { id: "club", title: "Club", description: "Clubs scolaires, sportifs ou culturels." },
  { id: "government", title: "Public", description: "Municipalités, gouvernorats, ministères." },
  { id: "individual", title: "Individuel", description: "Initiatives portées par une personne." },
  { id: "other", title: "Autre", description: "Toute autre structure solidaire." },
];

export default function CreateOrganization() {
  const router = useRouter();
  const { user, account, loading } = useSession();

  const [type, setType] = useState<OrgType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const approved = account?.organizer_status === "approved" || account?.is_admin;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/organizations/new");
      return;
    }
    if (!approved) router.replace("/");
  }, [user, approved, loading, router]);

  if (loading || !user || !approved) {
    return (
      <Layout>
        <div className="mx-auto w-full max-w-2xl px-4 py-10">
          <Skeleton height={28} width="55%" />
          <div className="mt-6 space-y-3">
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={56} />
          </div>
        </div>
      </Layout>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!type) {
      setError("Choisissez un type d'organisation.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          description: description || undefined,
          city: city || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        router.push("/organizations/mine");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Impossible de créer l'organisation.");
        return;
      }
      router.push(`/organizations/${data.organization.id}/dashboard`);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">
          ← Retour
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900">
          Créer mon organisation
        </h1>
        <p className="mt-1 text-zinc-500">
          Votre organisation pourra ensuite organiser des actions solidaires.
        </p>

        {error && (
          <Alert variant="danger" style={{ marginTop: 24 }}>
            {error}
          </Alert>
        )}

        <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit}>
            <Stack gap={5}>
              <Stack gap={2}>
                <Text size="sm" weight="medium">
                  Type d&rsquo;organisation
                </Text>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ORG_TYPES.map((t) => {
                    const selected = type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setType(t.id)}
                        className={`rounded-2xl border-2 p-4 text-left transition-all ${
                          selected
                            ? "border-red-500 bg-red-50 shadow-sm"
                            : "border-zinc-200 bg-white hover:border-red-200"
                        }`}
                      >
                        <span
                          className={`block text-sm font-semibold ${
                            selected ? "text-red-700" : "text-zinc-900"
                          }`}
                        >
                          {t.title}
                        </span>
                        <span className="mt-1 block text-xs text-zinc-500">
                          {t.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Stack>

              <FormField label="Nom de l&rsquo;organisation">
                <Input
                  type="text"
                  required
                  minLength={3}
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Croissant Rouge Tunisien"
                />
              </FormField>

              <FormField label="Ville (siège)">
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Tunis"
                />
              </FormField>

              <FormField label="Description">
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Présentez vos missions et vos actions..."
                />
              </FormField>

              <Button type="submit" fullWidth loading={submitting} size="lg">
                Créer l&rsquo;organisation
              </Button>
            </Stack>
          </form>
        </div>
      </div>
    </Layout>
  );
}
