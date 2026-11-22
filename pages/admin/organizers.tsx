import { useEffect, useState } from "react";
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
  Flex,
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

type Organizer = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  account_status: "active" | "suspended" | "banned";
  organizer_status: string;
  is_admin: boolean;
  created_at: string;
  organizations: {
    id: string;
    name: string;
    type: string;
    city: string | null;
    verified: boolean;
    status: string;
  }[];
};

const FILTERS = [
  { id: "", label: "Tous" },
  { id: "approved", label: "Approuvés" },
  { id: "suspended", label: "Suspendus" },
  { id: "banned", label: "Bannis" },
] as const;

const ACCOUNT_LABELS: Record<string, string> = {
  active: "Actif",
  suspended: "Suspendu",
  banned: "Banni",
};

const ORGANIZER_LABELS: Record<string, string> = {
  none: "Sans statut",
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Refusé",
  suspended: "Suspendu",
  banned: "Banni",
};

const ORG_TYPE_LABELS: Record<string, string> = {
  club: "Club",
  ngo: "ONG",
  government: "Public",
  association: "Association",
  charity: "Caritatif",
  individual: "Individuel",
  other: "Autre",
};

const ACCOUNT_TONE: Record<string, "success" | "warning" | "danger"> = {
  active: "success",
  suspended: "warning",
  banned: "danger",
};

const ORGANIZER_TONE: Record<
  string,
  "success" | "warning" | "danger" | "neutral"
> = {
  none: "neutral",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  suspended: "warning",
  banned: "danger",
};

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const getServerSideProps: GetServerSideProps<{ profile: ProfileRow }> =
  async (ctx) => requireAdminPage(ctx);

export default function AdminOrganizers({ profile }: { profile: ProfileRow }) {
  const [items, setItems] = useState<Organizer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Organizer | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const params = new URLSearchParams();
        if (filter) params.set("status", filter);
        if (q.trim()) params.set("q", q.trim());
        const r = await fetch(`/api/admin/organizers?${params}`, {
          signal: controller.signal,
        });
        if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
        const data = await r.json();
        if (!controller.signal.aborted) {
          setItems(data.organizers ?? []);
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

  async function act(
    id: string,
    action:
      | "suspend"
      | "reinstate"
      | "ban"
      | "approve"
      | "grant_admin"
      | "revoke_admin"
      | "verify_org"
      | "unverify_org",
  ) {
    setBusy(action);
    try {
      const r = await fetch(`/api/admin/organizers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
      setSelected(null);
      setReason("");
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell
      title="Organisateurs"
      description="Gérez les comptes vérifiés : suspension, bannissement et rôles."
    >
      <Stack gap={6}>
        <Flex wrap align="center" justify="between" gap={3}>
          <Flex wrap gap={1.5}>
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
          </Flex>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Rechercher un organisateur"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </Flex>

        {error && <Alert variant="danger">{error}</Alert>}

        {!items && !error ? (
          <Stack gap={3}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={76} />
            ))}
          </Stack>
        ) : null}

        {items && items.length === 0 ? (
          <EmptyState title="Aucun organisateur" description="Aucun résultat." />
        ) : null}

        {items && items.length > 0 ? (
          <Stack gap={4}>
            {items.map((o) => {
              const org = o.organizations?.[0];
              return (
                <Card key={o.id}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-xs font-bold text-white">
                        {initials(o.full_name)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-zinc-900">
                            {o.full_name ?? "Sans nom"}
                          </p>
                          {o.is_admin && <Badge variant="info">Admin</Badge>}
                          <Badge variant={ACCOUNT_TONE[o.account_status] ?? "neutral"} dot>
                            {ACCOUNT_LABELS[o.account_status] ?? o.account_status}
                          </Badge>
                          <Badge
                            variant={ORGANIZER_TONE[o.organizer_status] ?? "neutral"}
                          >
                            {ORGANIZER_LABELS[o.organizer_status] ?? o.organizer_status}
                          </Badge>
                          {org?.verified && <Badge variant="primary">Vérifié</Badge>}
                        </div>
                        <p className="mt-1.5 truncate text-sm text-zinc-500">
                          {org ? (
                            <>
                              <span className="font-medium text-zinc-700">{org.name}</span>
                              {" · "}
                              {ORG_TYPE_LABELS[org.type] ?? org.type}
                            </>
                          ) : (
                            "Aucune organisation"
                          )}
                          {org?.city ? ` · ${org.city}` : ""}
                          {o.phone ? ` · ${o.phone}` : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelected(o);
                        setReason("");
                      }}
                    >
                      Gérer
                    </Button>
                  </div>
                </Card>
              );
            })}
          </Stack>
        ) : null}
      </Stack>

      <Modal open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <ModalContent size="md">
          {selected && (
            <>
              <ModalHeader>
                <ModalTitle>{selected.full_name ?? "Organisateur"}</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <Stack gap={4}>
                  <Text size="sm" tone="muted">
                    Les actions de restriction déconnectent immédiatement le compte de
                    toutes ses sessions.
                  </Text>
                  <div>
                    <Text size="sm" weight="medium">
                      Motif (optionnel, journalisé)
                    </Text>
                    <Textarea
                      rows={2}
                      className="mt-1"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.account_status !== "active" ? (
                      <Button
                        size="sm"
                        loading={busy === "reinstate"}
                        onClick={() => act(selected.id, "reinstate")}
                      >
                        Réactiver
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          loading={busy === "suspend"}
                          onClick={() => act(selected.id, "suspend")}
                        >
                          Suspendre
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={busy === "ban"}
                          onClick={() => act(selected.id, "ban")}
                        >
                          Bannir
                        </Button>
                      </>
                    )}
                    {selected.organizer_status !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busy === "approve"}
                        onClick={() => act(selected.id, "approve")}
                      >
                        Approuver
                      </Button>
                    )}
                  </div>
                </Stack>
              </ModalBody>
              <ModalFooter>
                <Button
                  size="sm"
                  variant="outline"
                  loading={busy === "verify_org"}
                  onClick={() => act(selected.id, "verify_org")}
                >
                  Vérifier l&rsquo;organisation
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={busy === "unverify_org"}
                  onClick={() => act(selected.id, "unverify_org")}
                >
                  Retirer la vérification
                </Button>
                {selected.is_admin ? (
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busy === "revoke_admin"}
                    disabled={selected.id === profile.id}
                    onClick={() => act(selected.id, "revoke_admin")}
                  >
                    Retirer admin
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    loading={busy === "grant_admin"}
                    onClick={() => act(selected.id, "grant_admin")}
                  >
                    Nommer admin
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </AdminShell>
  );
}
