import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Stack,
  Text,
} from "@adem.rejeb/ui";
import EventRegistrations from "@/components/EventRegistrations";
import { formatEventDate } from "@/lib/format";

export type ManageableEvent = {
  id: string;
  title: string;
  status: string;
  start_at: string;
  city: string | null;
  image_url: string | null;
  max_volunteers: number | null;
  volunteer_count?: number;
  registration_count?: number;
};

const statusStyles: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  draft: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  completed: "bg-blue-50 text-blue-700 ring-blue-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
};

const statusLabels: Record<string, string> = {
  published: "Publiée",
  draft: "Brouillon",
  completed: "Terminée",
  cancelled: "Annulée",
};

export default function OrganizerEventList({
  events,
  onChanged,
}: {
  events: ManageableEvent[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ManageableEvent | null>(null);

  async function updateStatus(ev: ManageableEvent) {
    setBusy(ev.id);
    setError(null);
    try {
      const next = ev.status === "published" ? "draft" : "published";
      const res = await fetch(`/api/events/${ev.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Action refusée.");
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setBusy(toDelete.id);
    setError(null);
    try {
      const res = await fetch(`/api/events/${toDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Suppression refusée.");
      setToDelete(null);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="manage-events-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="manage-events-heading" className="text-lg font-semibold text-zinc-900">
          Gérer mes actions
        </h2>
        <Link href="/events/new">
          <Button size="sm" variant="outline">
            + Nouvelle action
          </Button>
        </Link>
      </div>

      {error ? (
        <Alert variant="danger" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </Alert>
      ) : null}

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <Text tone="muted">Aucune action pour le moment.</Text>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => {
            const canToggle = ev.status === "published" || ev.status === "draft";
            return (
              <li
                key={ev.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 sm:flex-nowrap"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                  {ev.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ev.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-500 to-orange-500 text-sm font-bold text-white">
                      {ev.title.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/events/${ev.id}`}
                      className="truncate text-sm font-semibold text-zinc-900 hover:text-red-700"
                    >
                      {ev.title}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                        statusStyles[ev.status] ?? statusStyles.draft
                      }`}
                    >
                      {statusLabels[ev.status] ?? ev.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {formatEventDate(ev.start_at)}
                    {ev.city ? ` · ${ev.city}` : ""} · {ev.registration_count ?? 0} inscrit(s)
                    {ev.max_volunteers ? ` / ${ev.max_volunteers}` : ""}
                  </p>
                </div>

                <Stack direction="row" gap={2} wrap>
                  <EventRegistrations eventId={ev.id} />
                  <Link href={`/events/${ev.id}/edit`}>
                    <Button size="sm" variant="ghost">
                      Modifier
                    </Button>
                  </Link>
                  {canToggle ? (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busy === ev.id}
                      disabled={busy !== null}
                      onClick={() => void updateStatus(ev)}
                    >
                      {ev.status === "published" ? "Dépublier" : "Publier"}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => setToDelete(ev)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Supprimer
                  </Button>
                </Stack>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <ModalContent size="sm">
          <ModalHeader>
            <ModalTitle>Supprimer cette action&nbsp;?</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <Text size="sm" tone="muted">
              «&nbsp;{toDelete?.title}&nbsp;» et ses inscriptions seront définitivement
              supprimées. Cette action est irréversible.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setToDelete(null)} disabled={busy !== null}>
              Annuler
            </Button>
            <Button variant="danger" loading={busy !== null} onClick={() => void remove()}>
              Supprimer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
}
