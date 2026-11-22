import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Card, FormField, Input, Stack } from "@adem.rejeb/ui";

type ContactValues = {
  public_email: string;
  public_phone: string;
  website: string;
  facebook_url: string;
  instagram_url: string;
};

const EMPTY: ContactValues = {
  public_email: "",
  public_phone: "",
  website: "",
  facebook_url: "",
  instagram_url: "",
};

/**
 * Contact block shown on the organization's public page. Facebook/Instagram
 * links are only rendered publicly when their page metadata can be resolved,
 * so an unreachable profile never becomes a bare URL.
 */
export default function OrgContactForm({ orgId }: { orgId: string }) {
  const [values, setValues] = useState<ContactValues>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/organizations/${orgId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => {
        if (!active || !d.organization) return;
        const org = d.organization;
        setValues({
          public_email: org.public_email ?? "",
          public_phone: org.public_phone ?? "",
          website: org.website ?? "",
          facebook_url: org.facebook_url ?? "",
          instagram_url: org.instagram_url ?? "",
        });
      })
      .catch(() => active && setError("Impossible de charger les coordonnées."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [orgId]);

  const set = (key: keyof ContactValues, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_email: values.public_email.trim() || null,
          public_phone: values.public_phone.trim() || null,
          website: values.website.trim() || null,
          facebook_url: values.facebook_url.trim() || null,
          instagram_url: values.instagram_url.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Enregistrement impossible.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card bordered>
      <Card.Header>
        <Card.Title as="h2">Coordonnées publiques</Card.Title>
        <Card.Description>
          Ces informations apparaissent sur votre page organisation et sur vos
          actions. Laissez un champ vide pour le masquer.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap={4}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="E-mail public" optional>
                <Input
                  type="email"
                  value={values.public_email}
                  onChange={(e) => set("public_email", e.target.value)}
                  placeholder="contact@association.tn"
                  disabled={loading}
                />
              </FormField>
              <FormField label="Téléphone" optional>
                <Input
                  type="tel"
                  value={values.public_phone}
                  onChange={(e) => set("public_phone", e.target.value)}
                  placeholder="+216 20 000 000"
                  disabled={loading}
                />
              </FormField>
            </div>
            <FormField label="Site web" optional>
              <Input
                type="url"
                value={values.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://association.tn"
                disabled={loading}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Page Facebook"
                description="Affichée si le nom et le logo de la page sont récupérables."
                optional
              >
                <Input
                  type="url"
                  value={values.facebook_url}
                  onChange={(e) => set("facebook_url", e.target.value)}
                  placeholder="https://facebook.com/association"
                  disabled={loading}
                />
              </FormField>
              <FormField
                label="Profil Instagram"
                description="Affiché uniquement si son aperçu est récupérable."
                optional
              >
                <Input
                  type="url"
                  value={values.instagram_url}
                  onChange={(e) => set("instagram_url", e.target.value)}
                  placeholder="https://instagram.com/association"
                  disabled={loading}
                />
              </FormField>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {saved && <Alert variant="success">Coordonnées enregistrées.</Alert>}

            <div className="flex justify-end">
              <Button type="submit" variant="primary" loading={saving} disabled={loading}>
                Enregistrer les coordonnées
              </Button>
            </div>
          </Stack>
        </form>
      </Card.Body>
    </Card>
  );
}
