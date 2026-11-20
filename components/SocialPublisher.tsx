import { useEffect, useState } from "react";
import ImageUpload from "./ImageUpload";
import { Alert, Button, FormField, Input, Select, Textarea } from "@adem.rejeb/ui";

type Account = { platform: "facebook" | "instagram"; account_name: string | null; account_id: string | null; connected: boolean };
type Result = { platform: string; ok: boolean; id?: string; error?: string };

const PLATFORMS: { id: "facebook" | "instagram"; label: string; color: string }[] = [
  { id: "facebook", label: "Facebook", color: "bg-[#1877F2]" },
  { id: "instagram", label: "Instagram", color: "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" },
];

export default function SocialPublisher({ orgId }: { orgId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [platform, setPlatform] = useState<"facebook" | "instagram">("facebook");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [token, setToken] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  async function loadAccounts() {
    setLoadingAccounts(true);
    try {
      const res = await fetch(`/api/social/accounts?org_id=${encodeURIComponent(orgId)}`);
      const d = await res.json();
      if (res.ok) {
        setAccounts(d.accounts ?? []);
        setSelected((d.accounts ?? []).map((a: Account) => a.platform));
      }
    } finally {
      setLoadingAccounts(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `/api/social/accounts?org_id=${encodeURIComponent(orgId)}`,
          { signal: controller.signal },
        );
        const d = await res.json();
        if (!controller.signal.aborted && res.ok) {
          setAccounts(d.accounts ?? []);
          setSelected((d.accounts ?? []).map((a: Account) => a.platform));
        }
      } catch {
        /* aborted or network error — leave state unchanged */
      } finally {
        if (!controller.signal.aborted) setLoadingAccounts(false);
      }
    })();
    return () => controller.abort();
  }, [orgId]);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setConnectError(null);
    setConnecting(true);
    try {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, platform, account_id: accountId, account_name: accountName, access_token: token }),
      });
      const d = await res.json();
      if (!res.ok) {
        setConnectError(d.error ?? "Connexion impossible.");
        return;
      }
      setAccountId("");
      setAccountName("");
      setToken("");
      await loadAccounts();
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect(p: string) {
    await fetch(`/api/social/accounts?org_id=${encodeURIComponent(orgId)}&platform=${p}`, {
      method: "DELETE",
    });
    await loadAccounts();
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setPublishError(null);
    setResults(null);
    setPublishing(true);
    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          caption,
          image_url: imageUrl,
          link_url: linkUrl,
          platforms: selected,
        }),
      });
      const d = await res.json();
      if (!res.ok && !d.results) {
        setPublishError(d.error ?? "Publication impossible.");
        return;
      }
      setResults(d.results ?? []);
    } catch {
      setPublishError("Une erreur est survenue. Réessayez.");
    } finally {
      setPublishing(false);
    }
  }

  const hasAccount = accounts.length > 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
            <path d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-4 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
          </svg>
        </span>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Réseaux sociaux</h2>
          <p className="text-sm text-zinc-500">
            Publiez vos actions sur la page Facebook et Instagram de votre organisation.
          </p>
        </div>
      </div>

      {/* Connected accounts */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-zinc-700">Comptes connectés</p>
        {loadingAccounts ? (
          <div className="h-10 w-40 animate-pulse rounded-full bg-zinc-100" />
        ) : hasAccount ? (
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => {
              const meta = PLATFORMS.find((p) => p.id === a.platform);
              return (
                <span key={a.platform} className="flex items-center gap-2 rounded-full border border-zinc-200 py-1 pl-1 pr-3 text-sm">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${meta?.color ?? "bg-zinc-500"}`}>
                    {meta?.label.charAt(0)}
                  </span>
                  <span className="font-medium text-zinc-800">{meta?.label}</span>
                  <span className="text-xs text-zinc-400">{a.account_name || a.account_id}</span>
                  <button
                    type="button"
                    onClick={() => disconnect(a.platform)}
                    className="ml-1 text-xs text-zinc-400 hover:text-red-600"
                  >
                    Retirer
                  </button>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Aucun compte connecté.</p>
        )}
      </div>

      {/* Connect form */}
      <details className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700">
          Connecter / mettre à jour un compte
        </summary>
        <form onSubmit={connect} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Plateforme">
              <Select value={platform} onChange={(e) => setPlatform(e.target.value as "facebook" | "instagram")}>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
              </Select>
            </FormField>
            <FormField label={platform === "facebook" ? "ID de la page" : "ID du compte Instagram Business"}>
              <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="1234567890" required />
            </FormField>
          </div>
          <FormField label="Nom affiché (optionnel)">
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Croissant Rouge Tunisien" />
          </FormField>
          <FormField label="Jeton d'accès (access token)">
            <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAG..." required />
          </FormField>
          {connectError && <Alert variant="danger">{connectError}</Alert>}
          <Button type="submit" variant="outline" loading={connecting}>
            Enregistrer le compte
          </Button>
          <p className="text-xs text-zinc-400">
            Le jeton est stocké côté serveur et n&rsquo;est jamais renvoyé au navigateur.
          </p>
        </form>
      </details>

      {/* Compose */}
      {hasAccount && (
        <form onSubmit={publish} className="space-y-4 border-t border-zinc-100 pt-5">
          <p className="text-sm font-medium text-zinc-700">Nouvelle publication</p>

          <FormField label="Texte de la publication">
            <Textarea rows={4} maxLength={2200} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Résumez votre action, remerciez les bénévoles, partagez le lien..." />
          </FormField>

          <div>
            <p className="mb-1 text-sm font-medium text-zinc-700">Image (optionnel)</p>
            <ImageUpload bucket="event-images" currentUrl={imageUrl} onUpload={setImageUrl} label="Ajouter une image" />
          </div>

          <FormField label="Lien à joindre (optionnel)">
            <Input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://yedlkhir.tn/events/..." />
          </FormField>

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700">Publier sur</p>
            <div className="flex flex-wrap gap-3">
              {accounts.map((a) => {
                const meta = PLATFORMS.find((p) => p.id === a.platform);
                const checked = selected.includes(a.platform);
                return (
                  <label key={a.platform} className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked ? [...prev, a.platform] : prev.filter((p) => p !== a.platform),
                        )
                      }
                      className="h-4 w-4 accent-red-600"
                    />
                    {meta?.label}
                  </label>
                );
              })}
            </div>
          </div>

          {publishError && <Alert variant="danger">{publishError}</Alert>}

          <Button type="submit" variant="primary" loading={publishing} disabled={selected.length === 0 || !caption.trim()}>
            Publier maintenant
          </Button>

          {results && (
            <div className="space-y-2 rounded-2xl bg-zinc-50 p-4">
              {results.map((r) => (
                <div key={r.platform} className="flex items-center gap-2 text-sm">
                  <span className={r.ok ? "text-green-600" : "text-red-600"}>
                    {r.ok ? "✓" : "✕"}
                  </span>
                  <span className="font-medium capitalize">{r.platform}</span>
                  <span className="text-zinc-500">
                    {r.ok ? `Publié (id ${r.id ?? "—"})` : r.error}
                  </span>
                </div>
              ))}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
