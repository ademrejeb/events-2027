import Link from "next/link";
import { useState, type FormEvent } from "react";
import AuthLayout from "@/components/AuthLayout";
import {
  Alert,
  Button,
  FormField,
  Input,
  Stack,
  Text,
  Textarea,
} from "@adem.rejeb/ui";

const KINDS = [
  { id: "association", label: "Association" },
  { id: "charity", label: "Organisme caritatif" },
  { id: "club", label: "Club" },
  { id: "ngo", label: "ONG" },
  { id: "government", label: "Institution publique" },
  { id: "individual", label: "Initiative individuelle" },
  { id: "other", label: "Autre" },
] as const;

type Kind = (typeof KINDS)[number]["id"];

export default function Signup() {
  const [kind, setKind] = useState<Kind | null>(null);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!kind) {
      setError("Choisissez le type d'organisateur.");
      return;
    }
    if (!terms) {
      setError("Vous devez accepter les conditions pour soumettre votre candidature.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          kind,
          contact_name: contactName,
          phone,
          city,
          description,
          links,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Candidature impossible.");
        return;
      }
      setDone(true);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="w-full rounded-3xl border border-zinc-100 bg-white/90 p-8 text-center shadow-2xl shadow-red-100/50 backdrop-blur-xl">
          <Stack gap={4} align="center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
              ✓
            </div>
            <Text weight="bold" size="lg">
              Candidature envoyée
            </Text>
            <Text tone="muted" size="sm">
              Merci ! Votre demande a bien été enregistrée. Notre équipe examine
              chaque candidature manuellement. Vous recevrez une réponse par e-mail
              à <strong>{email}</strong>. Vous pourrez vous connecter une fois votre
              compte organisateur approuvé.
            </Text>
            <Stack gap={2} style={{ width: "100%" }}>
              <Link href="/">
                <Button fullWidth>Retour à l&rsquo;accueil</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" fullWidth>
                  Aller à la connexion
                </Button>
              </Link>
            </Stack>
          </Stack>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full">
        <div className="rounded-3xl border border-zinc-100 bg-white/90 p-8 shadow-2xl shadow-red-100/50 backdrop-blur-xl">
          <Stack gap={4}>
            <Stack gap={1}>
              <Text weight="bold" size="lg">
                Devenir organisateur
              </Text>
              <Text tone="muted" size="sm">
                Les comptes organisateur sont vérifiés manuellement avant activation.
              </Text>
            </Stack>

            {error && <Alert variant="danger">{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <Stack gap={4}>
                <Stack gap={2}>
                  <Text size="sm" weight="medium">
                    Type d&rsquo;organisateur
                  </Text>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {KINDS.map((r) => {
                      const selected = kind === r.id;
                      return (
                        <Button
                          key={r.id}
                          type="button"
                          variant={selected ? "primary" : "outline"}
                          onClick={() => setKind(r.id)}
                        >
                          {r.label}
                        </Button>
                      );
                    })}
                  </div>
                </Stack>

                <FormField label="Nom de l'organisateur / organisation">
                  <Input
                    type="text"
                    required
                    minLength={3}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex : Croissant Rouge Tunisien — Comité local"
                  />
                </FormField>

                <FormField label="Nom du responsable">
                  <Input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Ex : Sami Ben Ali"
                    autoComplete="name"
                  />
                </FormField>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Téléphone">
                    <Input
                      type="tel"
                      required
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+216 00 000 000"
                    />
                  </FormField>
                  <FormField label="Ville">
                    <Input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex : Tunis"
                    />
                  </FormField>
                </div>

                <FormField label="Description de vos activités">
                  <Textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez brièvement votre mission et vos actions."
                  />
                </FormField>

                <FormField label="Liens (site, réseau social)">
                  <Input
                    type="text"
                    value={links}
                    onChange={(e) => setLinks(e.target.value)}
                    placeholder="https://..."
                  />
                </FormField>

                <FormField label="Email">
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                  />
                </FormField>

                <FormField label="Mot de passe">
                  <Input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                  />
                </FormField>

                <label className="flex items-start gap-3 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-red-600"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                  />
                  <span>
                    Je certifie l&rsquo;exactitude des informations fournies et
                    j&rsquo;accepte les conditions d&rsquo;utilisation.
                  </span>
                </label>

                <Button type="submit" fullWidth loading={submitting}>
                  Soumettre ma candidature
                </Button>
              </Stack>
            </form>
          </Stack>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Déjà un compte approuvé ?{" "}
          <Link href="/login" className="font-semibold text-red-600 hover:text-red-700">
            Se connecter
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Vous souhaitez simplement participer ?{" "}
          <Link href="/#evenements" className="font-semibold text-red-600 hover:text-red-700">
            Rejoignez une action sans compte
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
