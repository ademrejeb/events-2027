"use client";

import { useCallback, useEffect, useState } from "react";
import ImageUpload from "@/components/ImageUpload";
import {
  Alert,
  Badge,
  Button,
  Card,
  FormField,
  Input,
  Select,
  Textarea,
} from "@adem.rejeb/ui";

type Platform = "facebook" | "instagram";
type Account = {
  platform: Platform;
  account_id: string | null;
  account_name: string | null;
  public_url: string | null;
  updated_at: string;
};
type Result = { platform: string; ok: boolean; id?: string; error?: string };
type Post = {
  id: string;
  scope: "platform" | "crosspost" | "organization";
  caption: string;
  image_url: string | null;
  link_url: string | null;
  platforms: string[];
  results: Result[];
  source_org_id: string | null;
  source_org_name: string | null;
  created_at: string;
};

const LABEL: Record<Platform, string> = { facebook: "Facebook", instagram: "Instagram" };
const BADGE: Record<Platform, string> = {
  facebook: "bg-[#1877F2]",
  instagram: "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]",
};

function when(value: string) {
  try {
    return new Date(value).toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function AdminSocial() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState<Platform>("facebook");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [selected, setSelected] = useState<Platform[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/social/accounts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossible de charger les comptes.");
      const nextAccounts: Account[] = data.accounts ?? [];
      setAccounts(nextAccounts);
      setPosts(data.posts ?? []);
      setSelected((previous) => {
        const connected = nextAccounts.map((account) => account.platform);
        const kept = previous.filter((item) => connected.includes(item));
        return kept.length > 0 ? kept : connected;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    setConnectError(null);
    setConnecting(true);
    try {
      const res = await fetch("/api/admin/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          account_id: accountId,
          account_name: accountName,
          public_url: publicUrl || null,
          access_token: token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConnectError(data.error ?? "Connexion impossible.");
        return;
      }
      setAccountId("");
      setAccountName("");
      setPublicUrl("");
      setToken("");
      await load();
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect(value: Platform) {
    if (!window.confirm(`Déconnecter la page ${LABEL[value]} centrale ?`)) return;
    const res = await fetch(`/api/admin/social/accounts?platform=${value}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setConnectError(data.error ?? "Suppression impossible.");
      return;
    }
    await load();
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setPublishError(null);
    setResults(null);
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          image_url: imageUrl,
          link_url: linkUrl || null,
          platforms: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok && !data.results) {
        setPublishError(data.error ?? "Publication impossible.");
        return;
      }
      setResults(data.results ?? []);
      setCaption("");
      setImageUrl(null);
      setLinkUrl("");
      await load();
    } finally {
      setPublishing(false);
    }
  }

  const byPlatform = (value: Platform) => accounts.find((a) => a.platform === value);

  return (
    <div className="space-y-6">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <Card.Header>
            <Card.Title as="h2">Comptes centraux</Card.Title>
            <Card.Description>
              Une page Facebook et un compte Instagram Business appartenant à la
              plateforme. Les publications des organisations y sont repartagées
              automatiquement avec leurs hashtags.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {(["facebook", "instagram"] as const).map((value) => {
                const account = byPlatform(value);
                return (
                  <div
                    key={value}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${BADGE[value]}`}
                      >
                        {value === "facebook" ? "f" : "ig"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900">
                          {LABEL[value]}
                          {account ? (
                            <span className="ml-2 text-xs font-medium text-emerald-700">
                              connecté
                            </span>
                          ) : (
                            <span className="ml-2 text-xs font-medium text-zinc-400">
                              non connecté
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {account
                            ? `${account.account_name || "Sans nom"} · ${account.account_id}`
                            : value === "facebook"
                              ? "Page ID + jeton de page"
                              : "ID Instagram Business + jeton"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account?.public_url ? (
                        <a
                          href={account.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-red-700 hover:underline"
                        >
                          Ouvrir la page
                        </a>
                      ) : null}
                      {account ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void disconnect(value)}
                        >
                          Retirer
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={connect} className="mt-5 space-y-3 border-t border-zinc-100 pt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Plateforme">
                  <Select
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value as Platform)}
                  >
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                  </Select>
                </FormField>
                <FormField
                  label={platform === "facebook" ? "ID de la page" : "ID Instagram Business"}
                >
                  <Input
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    placeholder="1234567890"
                    required
                  />
                </FormField>
              </div>
              <FormField label="Nom affiché (optionnel)">
                <Input
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  placeholder="Yed Lkhir"
                />
              </FormField>
              <FormField
                label="URL publique de la page (optionnel)"
                description="Le lien « Ouvrir la page » affiché aux administrateurs."
              >
                <Input
                  type="url"
                  value={publicUrl}
                  onChange={(event) => setPublicUrl(event.target.value)}
                  placeholder={
                    platform === "facebook"
                      ? "https://facebook.com/yedlkhir"
                      : "https://instagram.com/yedlkhir"
                  }
                />
              </FormField>
              <FormField
                label="Jeton d’accès"
                description={
                  platform === "facebook"
                    ? "Jeton de page avec pages_manage_posts et pages_read_engagement."
                    : "Jeton avec instagram_content_publish et instagram_basic."
                }
              >
                <Input
                  type="password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="EAAG..."
                  autoComplete="new-password"
                  required
                />
              </FormField>
              {connectError ? <Alert variant="danger">{connectError}</Alert> : null}
              <Button type="submit" variant="outline" loading={connecting}>
                Enregistrer le compte central
              </Button>
              <p className="text-xs text-zinc-500">
                Le jeton est chiffré au repos et n’est jamais renvoyé au navigateur.
                Seuls les administrateurs peuvent le remplacer.
              </p>
            </form>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title as="h2">Publier sur la page centrale</Card.Title>
            <Card.Description>
              Une publication de la plateforme, visible par tous. Pour repartager
              une action, utilisez la page de l’organisation : elle est recopiée
              ici avec #Organisation et #YedLkhir.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            {accounts.length === 0 ? (
              <Alert variant="warning">
                Connectez au moins un compte central pour publier.
              </Alert>
            ) : (
              <form onSubmit={publish} className="space-y-3">
                <FormField label="Texte">
                  <Textarea
                    rows={5}
                    maxLength={2200}
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    placeholder="Annonce, appel à bénévoles, remerciement…"
                    required
                  />
                </FormField>
                <div>
                  <p className="mb-1 text-sm font-medium text-zinc-700">Image (optionnel)</p>
                  <ImageUpload
                    bucket="event-images"
                    currentUrl={imageUrl}
                    onUpload={setImageUrl}
                    label="Ajouter une image"
                  />
                </div>
                <FormField label="Lien (optionnel)">
                  <Input
                    type="url"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://yedlkhir.tn/events/..."
                  />
                </FormField>
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-700">Publier sur</p>
                  <div className="flex flex-wrap gap-3">
                    {accounts.map((account) => {
                      const checked = selected.includes(account.platform);
                      return (
                        <label
                          key={account.platform}
                          className="flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setSelected((previous) =>
                                event.target.checked
                                  ? [...previous, account.platform]
                                  : previous.filter((item) => item !== account.platform),
                              )
                            }
                            className="h-4 w-4 accent-red-600"
                          />
                          {LABEL[account.platform]}
                        </label>
                      );
                    })}
                  </div>
                </div>
                {publishError ? <Alert variant="danger">{publishError}</Alert> : null}
                <Button
                  type="submit"
                  variant="primary"
                  loading={publishing}
                  disabled={selected.length === 0 || caption.trim().length < 2}
                >
                  Publier sur la page centrale
                </Button>
                {results ? (
                  <div className="space-y-2 rounded-2xl bg-zinc-50 p-4">
                    {results.map((result) => (
                      <div key={result.platform} className="flex items-center gap-2 text-sm">
                        <span className={result.ok ? "text-green-600" : "text-red-600"}>
                          {result.ok ? "✓" : "✕"}
                        </span>
                        <span className="font-medium capitalize">{result.platform}</span>
                        <span className="text-zinc-500">
                          {result.ok ? `Publié (id ${result.id ?? "—"})` : result.error}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </form>
            )}
          </Card.Body>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <Card.Title as="h2">Publications centrales</Card.Title>
          <Card.Description>
            Les publications directes de la page et les repartages automatiques
            des organisations, avec le résultat par réseau.
          </Card.Description>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <p className="text-sm text-zinc-500">Chargement…</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune publication centrale pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {posts.map((post) => (
                <li key={post.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={post.scope === "crosspost" ? "info" : "neutral"}>
                      {post.scope === "crosspost" ? "Repartage" : "Page centrale"}
                    </Badge>
                    {post.source_org_name ? (
                      <span className="text-xs font-semibold text-zinc-600">
                        {post.source_org_name}
                      </span>
                    ) : null}
                    <span className="text-xs text-zinc-400">{when(post.created_at)}</span>
                  </div>
                  <p className="line-clamp-3 whitespace-pre-line text-sm text-zinc-700">
                    {post.caption}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {post.results.map((result) => (
                      <span
                        key={`${post.id}-${result.platform}`}
                        className={result.ok ? "text-emerald-700" : "text-red-600"}
                      >
                        {result.platform === "facebook" ? "Facebook" : "Instagram"}{" "}
                        {result.ok ? "✓" : `✕ ${result.error ?? ""}`}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card.Body>
      </Card>

      <Alert variant="info">
        Sécurité : les jetons sont chiffrés (AES-256-GCM), jamais renvoyés au
        navigateur, et seuls les administrateurs actifs peuvent les modifier ou
        publier. Chaque connexion/déconnexion/publication est journalisée.
      </Alert>
    </div>
  );
}
