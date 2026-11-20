import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import AuthLayout from "@/components/AuthLayout";
import { useSession } from "@/lib/session";
import { Alert, Button, FormField, Input, Stack, Text } from "@adem.rejeb/ui";

export default function Login() {
  const router = useRouter();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Connexion impossible.");
        return;
      }
      await refresh();
      const next =
        typeof router.query.next === "string" && router.query.next.startsWith("/")
          ? router.query.next
          : "/";
      router.push(next);
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="w-full">
        <div className="rounded-3xl border border-zinc-100 bg-white/90 p-8 shadow-2xl shadow-red-100/50 backdrop-blur-xl">
          <Stack gap={5}>
            <Stack gap={1}>
              <Text weight="bold" size="lg">
                Bon retour parmi nous
              </Text>
              <Text tone="muted" size="sm">
                Connectez-vous à votre espace organisateur.
              </Text>
            </Stack>

            {error && <Alert variant="danger">{error}</Alert>}

            <form onSubmit={handleSubmit}>
              <Stack gap={4}>
                <FormField label="Email">
                  <Input
                    id="email"
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
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </FormField>
                <Button type="submit" fullWidth loading={submitting} size="lg">
                  Se connecter
                </Button>
              </Stack>
            </form>
          </Stack>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Pas encore organisateur ?{" "}
          <Link href="/signup" className="font-semibold text-red-600 hover:text-red-700">
            Soumettre une candidature
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
