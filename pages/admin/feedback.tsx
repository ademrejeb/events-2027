import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { requireAdminPage } from "@/lib/page-auth";
import type { ProfileRow } from "@/lib/authz";
import AdminShell from "@/components/AdminShell";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Flex,
  Select,
  Skeleton,
  Stack,
  Text,
  Textarea,
} from "@adem.rejeb/ui";

type FeedbackRow = {
  id: string;
  type: "improvement" | "bug" | "data" | "other";
  subject: string;
  message: string;
  contact_email: string | null;
  user_id: string | null;
  status: "open" | "in_review" | "resolved" | "dismissed";
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

type Status = FeedbackRow["status"];

const STATUS_LABELS: Record<Status, string> = {
  open: "Nouveau",
  in_review: "En cours",
  resolved: "Résolu",
  dismissed: "Classé",
};

const STATUS_TONE: Record<Status, "warning" | "info" | "success" | "neutral"> = {
  open: "warning",
  in_review: "info",
  resolved: "success",
  dismissed: "neutral",
};

const TYPE_LABELS: Record<FeedbackRow["type"], string> = {
  improvement: "Amélioration",
  bug: "Bug",
  data: "Donnée",
  other: "Autre",
};

const TYPE_TONE: Record<
  FeedbackRow["type"],
  "info" | "danger" | "warning" | "neutral"
> = {
  improvement: "info",
  bug: "danger",
  data: "warning",
  other: "neutral",
};

const FILTERS: { id: "" | Status; label: string }[] = [
  { id: "", label: "Tous" },
  { id: "open", label: "Nouveaux" },
  { id: "in_review", label: "En cours" },
  { id: "resolved", label: "Résolus" },
  { id: "dismissed", label: "Classés" },
];

export const getServerSideProps: GetServerSideProps<{ profile: ProfileRow }> =
  async (ctx) => requireAdminPage(ctx);

export default function AdminFeedback({ profile }: { profile: ProfileRow }) {
  const [items, setItems] = useState<FeedbackRow[] | null>(null);
  const [counts, setCounts] = useState<Record<Status, number>>({
    open: 0,
    in_review: 0,
    resolved: 0,
    dismissed: 0,
  });
  const [filter, setFilter] = useState<"" | Status>("");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteOpen, setNoteOpen] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams();
        if (filter) params.set("status", filter);
        const r = await fetch(`/api/admin/feedback?${params}`, {
          signal: controller.signal,
        });
        if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
        const data = await r.json();
        if (!controller.signal.aborted) {
          setItems(data.feedback ?? []);
          setCounts(data.counts ?? { open: 0, in_review: 0, resolved: 0, dismissed: 0 });
          setError(null);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      }
    })();
    return () => controller.abort();
  }, [filter, reloadKey]);

  function refresh() {
    setItems(null);
    setReloadKey((k) => k + 1);
  }

  function replace(updated: FeedbackRow) {
    setItems((prev) =>
      prev ? prev.map((row) => (row.id === updated.id ? updated : row)) : prev,
    );
    setCounts((prev) => {
      const before = items?.find((row) => row.id === updated.id)?.status;
      if (!before || before === updated.status) return prev;
      return {
        ...prev,
        [before]: Math.max(0, (prev[before] ?? 0) - 1),
        [updated.status]: (prev[updated.status] ?? 0) + 1,
      };
    });
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setError(null);
    try {
      const r = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.error ?? "Erreur");
      replace(data.feedback as FeedbackRow);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function saveNote(row: FeedbackRow) {
    const note = notes[row.id] ?? row.admin_note ?? "";
    await patch(row.id, { admin_note: note });
    setNoteOpen(null);
  }

  return (
    <AdminShell
      title="Signalements"
      description={`${profile.full_name ?? profile.id} · messages envoyés depuis la page À propos.`}
      actions={
        <Button variant="outline" onClick={refresh}>
          Actualiser
        </Button>
      }
    >
      <Stack gap={6}>
        <Flex wrap gap={1.5} role="group" aria-label="Filtrer par statut">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const count = f.id ? counts[f.id] : Object.values(counts).reduce((a, b) => a + b, 0);
            return (
              <button
                key={f.id || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                  (active
                    ? "border-red-600 bg-red-50 text-red-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900")
                }
              >
                {f.label}
                <span className="ml-1.5 tabular-nums text-zinc-400">{count}</span>
              </button>
            );
          })}
        </Flex>

        {error && <Alert variant="danger">{error}</Alert>}

        {!items && !error && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5">
                <Skeleton height={14} width="30%" />
                <div className="mt-3">
                  <Skeleton height={12} width="70%" />
                </div>
                <div className="mt-2">
                  <Skeleton height={12} width="55%" />
                </div>
              </div>
            ))}
          </div>
        )}

        {items && items.length === 0 && (
          <EmptyState
            title="Aucun signalement"
            description="Les messages envoyés depuis la page À propos apparaîtront ici."
          />
        )}

        {items && items.length > 0 && (
          <div className="space-y-4">
            {items.map((row) => (
              <article
                key={row.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={TYPE_TONE[row.type]} size="sm">
                    {TYPE_LABELS[row.type]}
                  </Badge>
                  <Badge variant={STATUS_TONE[row.status]} size="sm" dot>
                    {STATUS_LABELS[row.status]}
                  </Badge>
                  <time
                    className="ml-auto text-xs text-zinc-400"
                    dateTime={row.created_at}
                  >
                    {new Date(row.created_at).toLocaleString("fr-TN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>

                <h2 className="mt-3 text-base font-bold text-zinc-900">{row.subject}</h2>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
                  {row.message}
                </p>

                {row.contact_email && (
                  <p className="mt-3 text-xs text-zinc-500">
                    Contact :{" "}
                    <a
                      href={`mailto:${row.contact_email}`}
                      className="link-underline font-medium text-red-700"
                    >
                      {row.contact_email}
                    </a>
                  </p>
                )}

                {row.admin_note && noteOpen !== row.id && (
                  <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                    <span className="font-semibold text-zinc-700">Note interne : </span>
                    {row.admin_note}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-4">
                  <label className="text-xs font-medium text-zinc-500">
                    <span className="mb-1 block">Statut</span>
                    <Select
                      value={row.status}
                      disabled={busy === row.id}
                      onChange={(e) =>
                        patch(row.id, { status: e.target.value as Status })
                      }
                      className="w-40"
                    >
                      {(Object.keys(STATUS_LABELS) as Status[]).map((value) => (
                        <option key={value} value={value}>
                          {STATUS_LABELS[value]}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setNoteOpen(noteOpen === row.id ? null : row.id)}
                  >
                    {row.admin_note ? "Modifier la note" : "Ajouter une note"}
                  </Button>
                  {row.resolved_at && (
                    <span className="ml-auto text-xs text-zinc-400">
                      Clos le{" "}
                      {new Date(row.resolved_at).toLocaleDateString("fr-TN")}
                    </span>
                  )}
                </div>

                {noteOpen === row.id && (
                  <div className="mt-3">
                    <Textarea
                      rows={3}
                      maxLength={1000}
                      value={notes[row.id] ?? row.admin_note ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      placeholder="Note visible uniquement par les administrateursâ€¦"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNoteOpen(null)}
                      >
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={busy === row.id}
                        onClick={() => saveNote(row)}
                      >
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        <Text tone="muted" size="xs">
          Les signalements sont stockés côté serveur uniquement : aucune donnée de
          contact n&rsquo;est exposée publiquement.
        </Text>
      </Stack>
    </AdminShell>
  );
}

