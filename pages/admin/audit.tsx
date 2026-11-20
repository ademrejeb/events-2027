import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { requireAdminPage } from "@/lib/page-auth";
import type { ProfileRow } from "@/lib/authz";
import AdminShell from "@/components/AdminShell";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Skeleton,
  Stack,
  Text,
} from "@adem.rejeb/ui";

type Entry = {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const PAGE_SIZE = 50;

export const getServerSideProps: GetServerSideProps<{ profile: ProfileRow }> =
  async (ctx) => requireAdminPage(ctx);

export default function AdminAudit() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        if (q.trim()) params.set("q", q.trim());
        const r = await fetch(`/api/admin/audit?${params}`, {
          signal: controller.signal,
        });
        if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
        const data = await r.json();
        if (!controller.signal.aborted) {
          setEntries(data.entries ?? []);
          setTotal(data.total ?? 0);
          setError(null);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      }
    })();
    return () => controller.abort();
  }, [offset, q]);

  const goTo = (next: number) => {
    setEntries(null);
    setOffset(next);
  };

  return (
    <AdminShell
      title="Journal d'audit"
      description="Trace inaltérable des actions administratives (append-only)."
    >
      <Stack gap={6}>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Filtrer par action"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {!entries && !error ? (
          <Stack gap={2}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={56} />
            ))}
          </Stack>
        ) : null}

        {entries && entries.length === 0 ? (
          <EmptyState title="Journal vide" description="Aucune entrée pour le moment." />
        ) : null}

        {entries && entries.length > 0 ? (
          <Card>
            <Stack gap={0}>
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800">
                      {e.action}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {e.actor_email ?? "système"}
                      {e.target_type ? ` → ${e.target_type}` : ""}
                      {e.target_id ? `:${e.target_id.slice(0, 8)}…` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {new Date(e.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
              ))}
            </Stack>
          </Card>
        ) : null}

        {entries && total > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-3">
            <Text size="sm" tone="muted">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} sur {total}
            </Text>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={offset === 0}
                onClick={() => goTo(Math.max(0, offset - PAGE_SIZE))}
              >
                Précédent
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => goTo(offset + PAGE_SIZE)}
              >
                Suivant
              </Button>
            </div>
          </div>
        ) : null}
      </Stack>
    </AdminShell>
  );
}
