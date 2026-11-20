import { useEffect, useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import { requireAdminPage } from "@/lib/page-auth";
import type { ProfileRow } from "@/lib/authz";
import AdminShell from "@/components/AdminShell";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Skeleton,
  Stack,
  Text,
  Textarea,
} from "@adem.rejeb/ui";

type Application = {
  id: string;
  name: string;
  kind: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  description: string | null;
  links: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn" | "suspended" | "banned";
  review_note: string | null;
  created_at: string;
};

const FILTERS = [
  { id: "", label: "Toutes" },
  { id: "pending", label: "En attente" },
  { id: "approved", label: "Approuvées" },
  { id: "rejected", label: "Refusées" },
] as const;

export const getServerSideProps: GetServerSideProps<{ profile: ProfileRow }> =
  async (ctx) => requireAdminPage(ctx);

export default function AdminApplications() {
  const [items, setItems] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("pending");
  const [q, setQ] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Application | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams();
        if (filter) params.set("status", filter);
        if (q.trim()) params.set("q", q.trim());
        const r = await fetch(`/api/admin/applications?${params}`, {
          signal: controller.signal,
        });
        if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
        const data = await r.json();
        if (!controller.signal.aborted) {
          setItems(data.applications ?? []);
          setError(null);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError((e as Error).message);
      }
    })();
    return () => controller.abort();
  }, [filter, q, reloadKey]);

  const refresh = () => {
    setItems(null);
    setReloadKey((k) => k + 1);
  };

  const statusVariant = useMemo(
    () => ({
      approved: "success" as const,
      rejected: "danger" as const,
      pending: "warning" as const,
      withdrawn: "neutral" as const,
      suspended: "warning" as const,
      banned: "danger" as const,
    }),
    [],
  );

  const STATUS_LABELS: Record<string, string> = {
    approved: "Approuvée",
    rejected: "Refusée",
    pending: "En attente",
    withdrawn: "Retirée",
    suspended: "Suspendue",
    banned: "Bannie",
  };

  async function review(action: "approve" | "reject" | "request_info") {
    if (!selected) return;
    setBusy(action);
    try {
      const r = await fetch(`/api/admin/applications/${selected.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
      setSelected(null);
      setNote("");
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell
      title="Candidatures d'organisateurs"
      description="Examinez les demandes et accordez ou refusez l'accès à la plateforme."
    >
      <Stack gap={6}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Button
                key={f.id}
                size="sm"
                variant={filter === f.id ? "primary" : "outline"}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Rechercher (nom, e-mail, ville)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {!items && !error ? (
          <Stack gap={3}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={72} />
            ))}
          </Stack>
        ) : null}

        {items && items.length === 0 ? (
          <EmptyState
            title="Aucune candidature"
            description="Aucune candidature ne correspond à ce filtre."
          />
        ) : null}

        {items && items.length > 0 ? (
          <Stack gap={4}>
            {items.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-zinc-900">{a.name}</p>
                          <Badge variant={statusVariant[a.status]}>
                            {STATUS_LABELS[a.status] ?? a.status}
                          </Badge>
                      <span className="text-xs text-zinc-400">{a.kind}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-zinc-500">
                      {a.email}
                      {a.city ? ` · ${a.city}` : ""}
                      {a.phone ? ` · ${a.phone}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelected(a);
                      setNote("");
                    }}
                  >
                    Examiner
                  </Button>
                </div>
              </Card>
            ))}
          </Stack>
        ) : null}
      </Stack>

      <Modal open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <ModalContent size="md">
          {selected && (
            <>
              <ModalHeader>
                <ModalTitle>{selected.name}</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <Stack gap={4}>
                  <div className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
                    <span>
                      <strong className="text-zinc-800">Type :</strong> {selected.kind}
                    </span>
                    <span>
                      <strong className="text-zinc-800">Responsable :</strong>{" "}
                      {selected.contact_name ?? "—"}
                    </span>
                    <span>
                      <strong className="text-zinc-800">E-mail :</strong> {selected.email}
                    </span>
                    <span>
                      <strong className="text-zinc-800">Téléphone :</strong>{" "}
                      {selected.phone ?? "—"}
                    </span>
                    <span>
                      <strong className="text-zinc-800">Ville :</strong>{" "}
                      {selected.city ?? "—"}
                    </span>
                    <span>
                      <strong className="text-zinc-800">Reçue le :</strong>{" "}
                      {new Date(selected.created_at).toLocaleString("fr-FR")}
                    </span>
                  </div>

                  {selected.description && (
                    <div>
                      <Text size="sm" weight="medium">
                        Description
                      </Text>
                      <p className="mt-1 whitespace-pre-line text-sm text-zinc-600">
                        {selected.description}
                      </p>
                    </div>
                  )}

                  {selected.links && (
                    <div>
                      <Text size="sm" weight="medium">
                        Liens
                      </Text>
                      <p className="mt-1 break-all text-sm text-zinc-600">{selected.links}</p>
                    </div>
                  )}

                  <div>
                    <Text size="sm" weight="medium">
                      Note de vérification (interne)
                    </Text>
                    <Textarea
                      rows={3}
                      className="mt-1"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Motif, informations demandées, pièces manquantes…"
                    />
                  </div>
                </Stack>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="outline"
                  size="sm"
                  loading={busy === "request_info"}
                  onClick={() => review("request_info")}
                >
                  Demander des informations
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={busy === "reject"}
                  onClick={() => review("reject")}
                >
                  Refuser
                </Button>
                <Button
                  size="sm"
                  loading={busy === "approve"}
                  onClick={() => review("approve")}
                >
                  Approuver
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </AdminShell>
  );
}
