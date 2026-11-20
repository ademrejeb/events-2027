import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ImageUpload from "@/components/ImageUpload";
import { useSession } from "@/lib/session";
import { Alert, Button, FormField, Input, Stack, Text, Textarea } from "@adem.rejeb/ui";

export default function Settings() {
  const router = useRouter();
  const { user, profile, loading, refresh: refreshSession } = useSession();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const ready = !loading && !!profile;

  if (ready && fullName === "" && phone === "" && bio === "" && avatarUrl === null && profile.full_name) {
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user || !profile) {
    return (
      <Layout>
        <div className="mx-auto max-w-lg px-4 py-10">
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-200" />
        </div>
      </Layout>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaved(false);
    setSaving(true);

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          bio,
          avatar_url: avatarUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Erreur lors de la sauvegarde");
        return;
      }

      if (refreshSession) await refreshSession();
      setSaved(true);
    } catch {
      setFormError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
            Mon profil
          </h1>
          <p className="mt-1 text-zinc-500">
            Gérez vos informations publiques et votre photo.
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <form onSubmit={handleSubmit}>
              <Stack gap={5}>
                <Stack direction="row" align="center" gap={4} wrap>
                  <div>
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-2xl font-bold text-red-600">
                        {fullName?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>
                  <Stack gap={1} style={{ flex: 1 }}>
                    <Text size="sm" weight="medium">
                      Photo de profil
                    </Text>
                    <ImageUpload bucket="avatars" currentUrl={avatarUrl} onUpload={setAvatarUrl} label="Changer la photo" />
                  </Stack>
                </Stack>

                <FormField label="Nom complet">
                  <Input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ahmed Ben Ali" />
                </FormField>

                <FormField label="Téléphone">
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" />
                </FormField>

                <FormField label="Bio">
                  <Textarea rows={4} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Décrivez-vous en quelques mots..." />
                  <Text size="xs" tone="muted" style={{ textAlign: "right" }}>
                    {bio.length}/500
                  </Text>
                </FormField>

                {formError && <Alert variant="danger">{formError}</Alert>}
                {saved && <Alert variant="success">Profil sauvegardé !</Alert>}

                <Button type="submit" fullWidth loading={saving}>
                  Sauvegarder
                </Button>
              </Stack>
            </form>
        </div>
      </div>
    </Layout>
  );
}
