import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalTitle,
  Skeleton,
  Stack,
  Text,
} from "@adem.rejeb/ui";

type Registration = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  skills: string | null;
  message: string | null;
  created_at: string;
};

type Volunteer = {
  id: string;
  profile_id: string;
  joined_at: string;
  profiles: { full_name: string | null; phone: string | null } | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Prevent spreadsheet formula injection in exported CSV cells. */
function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export default function EventRegistrations({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ registrations: Registration[]; volunteers: Volunteer[] } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    setData(null);
    setError(null);
    try {
      const r = await fetch(`/api/events/${eventId}/registrations`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Erreur");
      const d = await r.json();
      setData({ registrations: d.registrations ?? [], volunteers: d.volunteers ?? [] });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const filtered = useMemo(() => {
    if (!data) return null;
    const q = normalize(query);
    return {
      registrations: data.registrations.filter((r) =>
        !q || normalize(`${r.full_name ?? ""} ${r.email ?? ""} ${r.phone ?? ""}`).includes(q),
      ),
      volunteers: data.volunteers.filter((v) =>
        !q || normalize(`${v.profiles?.full_name ?? ""} ${v.profiles?.phone ?? ""}`).includes(q),
      ),
    };
  }, [data, query]);

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Nom", "Email", "Téléphone", "Compétences", "Message", "Inscrit le"],
      ...data.registrations.map((r) => [
        r.full_name ?? "",
        r.email ?? "",
        r.phone ?? "",
        r.skills ?? "",
        (r.message ?? "").replace(/\n/g, " "),
        new Date(r.created_at).toLocaleString("fr-FR"),
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscriptions-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
          void load();
        }}
      >
        Bénévoles
      </Button>

      <Modal open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>Bénévoles inscrits</ModalTitle>
          </ModalHeader>
          <ModalBody>
            {error && <Alert variant="danger">{error}</Alert>}

            {!data && !error ? (
              <Stack gap={2}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} height={44} />
                ))}
              </Stack>
            ) : null}

            {data ? (
              <Stack gap={5}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Text size="sm" tone="muted">
                    {data.registrations.length} sans compte ·{" "}
                    {data.volunteers.length} membre(s) de la communauté
                  </Text>
                  {data.registrations.length > 0 && (
                    <Button size="sm" variant="outline" onClick={exportCsv}>
                      Exporter CSV
                    </Button>
                  )}
                </div>

                {data.registrations.length === 0 && data.volunteers.length === 0 ? (
                  <Text tone="muted">Aucune inscription pour le moment.</Text>
                ) : (
                  <>
                    <Input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Rechercher un bénévole (nom, e-mail, téléphone)…"
                      aria-label="Rechercher un bénévole"
                    />

                    {filtered && filtered.registrations.length === 0 && filtered.volunteers.length === 0 ? (
                      <Text tone="muted" size="sm">
                        Aucun bénévole ne correspond à cette recherche.
                      </Text>
                    ) : null}

                    {filtered && filtered.registrations.length > 0 ? (
                      <div className="overflow-hidden rounded-xl border border-zinc-200">
                        <div className="max-h-[45vh] overflow-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 z-10 bg-white">
                              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
                                <th className="px-3 py-2">Nom</th>
                                <th className="px-3 py-2">Contact</th>
                                <th className="px-3 py-2">Compétences</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filtered.registrations.map((r) => (
                                <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                                  <td className="px-3 py-2 font-medium text-zinc-800">
                                    {r.full_name ?? "—"}
                                  </td>
                                  <td className="px-3 py-2 text-zinc-600">
                                    <div className="truncate">{r.email ?? "—"}</div>
                                    <div className="text-xs text-zinc-400">{r.phone ?? "—"}</div>
                                  </td>
                                  <td className="px-3 py-2 text-zinc-500">
                                    {r.skills ?? "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}

                    {filtered && filtered.volunteers.length > 0 ? (
                      <div>
                        <Text size="sm" weight="semibold">
                          Membres de la communauté ({filtered.volunteers.length})
                        </Text>
                        <ul className="mt-2 max-h-[30vh] space-y-1 overflow-auto rounded-xl border border-zinc-200 p-2 text-sm text-zinc-600">
                          {filtered.volunteers.map((v) => (
                            <li
                              key={v.id}
                              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-50"
                            >
                              <span className="truncate font-medium text-zinc-700">
                                {v.profiles?.full_name ?? "Bénévole"}
                              </span>
                              {v.profiles?.phone ? (
                                <span className="shrink-0 text-xs text-zinc-400">
                                  {v.profiles.phone}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {data.registrations.length > 0 ? (
                      <p className="text-xs text-zinc-400">
                        Données personnelles — à utiliser uniquement pour la coordination
                        de cette action.
                      </p>
                    ) : null}
                  </>
                )}
              </Stack>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
