import { useMemo, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import ImageUpload from "@/components/ImageUpload";
import PhotoGalleryUpload from "@/components/PhotoGalleryUpload";
import {
  Alert,
  Button,
  Card,
  FormField,
  Input,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
} from "@adem.rejeb/ui";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

export type Category = { id: string; name: string; slug: string };
export type OrgOption = { id: string; name: string; verified: boolean };

export type EventFormValues = {
  org_id: string;
  title: string;
  description: string;
  category_id: string;
  city: string;
  location: string;
  start_at: string;
  end_at: string;
  max_volunteers: string;
  status: "draft" | "published" | "cancelled" | "completed";
  image_url: string | null;
  before_images: string[];
  after_images: string[];
  locations: { label: string; lat: number; lng: number }[];
  lat: string;
  lng: string;
};

export const emptyEventForm: EventFormValues = {
  org_id: "",
  title: "",
  description: "",
  category_id: "",
  city: "",
  location: "",
  start_at: "",
  end_at: "",
  max_volunteers: "",
  status: "published",
  image_url: null,
  before_images: [],
  after_images: [],
  locations: [],
  lat: "",
  lng: "",
};

type FieldErrors = Partial<Record<keyof EventFormValues | "dates", string>>;

function validate(v: EventFormValues): FieldErrors {
  const e: FieldErrors = {};
  if (!v.org_id) e.org_id = "Choisissez une organisation.";
  const title = v.title.trim();
  if (title.length < 3) e.title = "Le titre doit contenir au moins 3 caractères.";
  else if (title.length > 120) e.title = "Le titre est trop long (120 caractères max).";
  if (!v.category_id) e.category_id = "Choisissez une catégorie.";
  if (!v.city.trim()) e.city = "Indiquez la ville.";
  if (!v.start_at) e.start_at = "Indiquez la date de début.";
  if (v.end_at && v.start_at && new Date(v.end_at) < new Date(v.start_at)) {
    e.end_at = "La fin doit être postérieure au début.";
  }
  if (v.max_volunteers) {
    const n = Number(v.max_volunteers);
    if (!Number.isInteger(n) || n < 1) e.max_volunteers = "Nombre de places invalide.";
  }
  if (v.description.length > 5000) e.description = "La description est trop longue.";
  return e;
}

type Props = {
  mode: "create" | "edit";
  initial?: EventFormValues;
  categories: Category[];
  orgs: OrgOption[];
  submitting: boolean;
  error: string | null;
  onSubmit: (values: EventFormValues) => void | Promise<void>;
  cancelHref: string;
};

export default function EventForm({
  mode,
  initial,
  categories,
  orgs,
  submitting,
  error,
  onSubmit,
  cancelHref,
}: Props) {
  const [values, setValues] = useState<EventFormValues>(initial ?? emptyEventForm);
  const [touched, setTouched] = useState(false);
  const [pendingLat, setPendingLat] = useState("");
  const [pendingLng, setPendingLng] = useState("");
  const [showExtra, setShowExtra] = useState(false);

  const errors = useMemo(() => validate(values), [values]);
  const invalid = Object.keys(errors).length > 0;
  const show = (k: keyof FieldErrors) => (touched ? errors[k] : undefined);

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (invalid) {
      const first = document.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.focus();
      return;
    }
    void onSubmit(values);
  }

  const noOrg = orgs.length === 0 && mode === "create";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap={6}>
        {error ? (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        ) : null}

        {noOrg ? (
          <Alert variant="warning">
            Vous n&rsquo;êtes membre d&rsquo;aucune organisation.{" "}
            <Link href="/organizations/new" className="font-semibold underline">
              Créez-en une
            </Link>{" "}
            pour publier une action.
          </Alert>
        ) : null}

        <Card bordered>
          <Card.Header>
            <Card.Title as="h2">Informations principales</Card.Title>
            <Card.Description>Ce que les bénévoles verront en premier.</Card.Description>
          </Card.Header>
          <Card.Body>
            <Stack gap={6}>
              <FormField
                label="Titre de l&rsquo;action"
                required
                error={show("title")}
                description="Court et concret, ex. « Nettoyage de la plage de Gammarth »."
              >
                <Input
                  type="text"
                  value={values.title}
                  maxLength={120}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Campagne de nettoyage à Sidi Bou Saïd"
                  aria-invalid={touched && !!errors.title}
                />
              </FormField>

              <div className="grid gap-5 sm:grid-cols-2">
                {mode === "create" ? (
                  <FormField
                    label="Organisation"
                    required
                    error={show("org_id")}
                    description="L&rsquo;organisation qui porte cette action."
                  >
                    <Select
                      value={values.org_id}
                      onChange={(e) => set("org_id", e.target.value)}
                      aria-invalid={touched && !!errors.org_id}
                    >
                      <option value="">Choisir une organisation</option>
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                          {o.verified ? " ✓" : ""}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                ) : (
                  <FormField label="Organisation">
                    <div className="flex h-10 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-600">
                      {orgs[0]?.name ?? "—"}
                    </div>
                  </FormField>
                )}

                <FormField label="Catégorie" required error={show("category_id")}>
                  <Select
                    value={values.category_id}
                    onChange={(e) => set("category_id", e.target.value)}
                    aria-invalid={touched && !!errors.category_id}
                  >
                    <option value="">Choisir une catégorie</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <FormField
                label="Description"
                error={show("description")}
                description="Mission, matériel fourni, point de rendez-vous…"
                optional
              >
                <Textarea
                  rows={5}
                  value={values.description}
                  maxLength={5000}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Décrivez la mission, le matériel fourni, le point de rendez-vous…"
                />
              </FormField>
            </Stack>
          </Card.Body>
        </Card>

        <Card bordered>
          <Card.Header>
            <Card.Title as="h2">Lieu</Card.Title>
            <Card.Description>Où se déroule l&rsquo;action.</Card.Description>
          </Card.Header>
          <Card.Body>
            <Stack gap={6}>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Ville" required error={show("city")}>
                  <Input
                    type="text"
                    value={values.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Tunis"
                    aria-invalid={touched && !!errors.city}
                  />
                </FormField>
                <FormField label="Lieu précis" optional>
                  <Input
                    type="text"
                    value={values.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="Place du village, Sidi Bou Saïd"
                  />
                </FormField>
              </div>

              <div>
                <Text size="sm" weight="medium">
                  Position sur la carte
                </Text>
                <div className="mt-3">
                  <LocationPicker
                    lat={values.lat}
                    lng={values.lng}
                    onChange={(la, ln) => setValues((p) => ({ ...p, lat: la, lng: ln }))}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-zinc-200 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Text as="p" size="sm" weight="medium">
                      Lieux supplémentaires
                    </Text>
                    <Text as="p" size="xs" tone="muted" className="mt-0.5">
                      Points de rendez-vous ou zones annexes (optionnel).
                    </Text>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExtra((v) => !v)}
                  >
                    {showExtra ? "Masquer" : "Ajouter un lieu"}
                  </Button>
                </div>

                {showExtra ? (
                  <div className="mt-4">
                    <LocationPicker
                      lat={pendingLat}
                      lng={pendingLng}
                      onChange={(la, ln) => {
                        setPendingLat(la);
                        setPendingLng(ln);
                      }}
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!pendingLat || !pendingLng}
                        onClick={() => {
                          setValues((prev) => ({
                            ...prev,
                            locations: [
                              ...prev.locations,
                              {
                                label: `Lieu ${prev.locations.length + 1}`,
                                lat: Number(pendingLat),
                                lng: Number(pendingLng),
                              },
                            ],
                          }));
                          setPendingLat("");
                          setPendingLng("");
                        }}
                      >
                        Ajouter ce lieu
                      </Button>
                    </div>
                  </div>
                ) : null}

                {values.locations.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {values.locations.map((loc, i) => (
                      <li
                        key={`${loc.lat}-${loc.lng}-${i}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2"
                      >
                        <span className="text-sm text-zinc-700">
                          {loc.label} · {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setValues((prev) => ({
                              ...prev,
                              locations: prev.locations.filter((_, idx) => idx !== i),
                            }))
                          }
                        >
                          Retirer
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Stack>
          </Card.Body>
        </Card>

        <Card bordered>
          <Card.Header>
            <Card.Title as="h2">Dates &amp; capacité</Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack gap={6}>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Date de début" required error={show("start_at")}>
                  <Input
                    type="datetime-local"
                    value={values.start_at}
                    onChange={(e) => set("start_at", e.target.value)}
                    aria-invalid={touched && !!errors.start_at}
                  />
                </FormField>
                <FormField label="Date de fin" error={show("end_at")} optional>
                  <Input
                    type="datetime-local"
                    value={values.end_at}
                    min={values.start_at || undefined}
                    onChange={(e) => set("end_at", e.target.value)}
                    aria-invalid={touched && !!errors.end_at}
                  />
                </FormField>
              </div>
              <FormField
                label="Nombre de places"
                error={show("max_volunteers")}
                description="Laissez vide pour un nombre illimité."
                optional
              >
                <Input
                  type="number"
                  min={1}
                  value={values.max_volunteers}
                  onChange={(e) => set("max_volunteers", e.target.value)}
                  placeholder="30"
                  aria-invalid={touched && !!errors.max_volunteers}
                />
              </FormField>
            </Stack>
          </Card.Body>
        </Card>

        <Card bordered>
          <Card.Header>
            <Card.Title as="h2">Visuels</Card.Title>
            <Card.Description>Des images aident les bénévoles à se projeter.</Card.Description>
          </Card.Header>
          <Card.Body>
            <Stack gap={6}>
              <Stack gap={2}>
                <Text size="sm" weight="medium">
                  Photo de couverture
                </Text>
                <ImageUpload
                  bucket="event-images"
                  currentUrl={values.image_url}
                  onUpload={(u) => set("image_url", u)}
                  label="Ajouter une photo de couverture"
                />
              </Stack>
              <Stack gap={2}>
                <Text size="sm" weight="medium">
                  Photos avant l&rsquo;action
                </Text>
                <PhotoGalleryUpload
                  bucket="event-images"
                  value={values.before_images}
                  onChange={(urls) => set("before_images", urls)}
                  label="Ajouter des photos avant"
                  hint="Préparez l’action : lieu, matériel, équipe. Vous pouvez en ajouter à tout moment."
                />
              </Stack>
              <Stack gap={2}>
                <Text size="sm" weight="medium">
                  Photos après l&rsquo;action
                </Text>
                <PhotoGalleryUpload
                  bucket="event-images"
                  value={values.after_images}
                  onChange={(urls) => set("after_images", urls)}
                  label="Ajouter des photos après"
                  hint="Elles sont publiées sur la page une fois la date de fin passée. Vous pouvez les ajouter pendant et après l’action."
                />
              </Stack>
            </Stack>
          </Card.Body>
        </Card>

        <Card bordered>
          <Card.Header>
            <Card.Title as="h2">Publication</Card.Title>
            <Card.Description>
              Un brouillon n&rsquo;est visible que par votre organisation.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <SegmentedControl
              label="Statut de publication"
              value={values.status}
              onValueChange={(v) => set("status", v as EventFormValues["status"])}
              options={
                mode === "edit"
                  ? [
                      { value: "draft", label: "Brouillon" },
                      { value: "published", label: "Publiée" },
                      { value: "completed", label: "Terminée" },
                      { value: "cancelled", label: "Annulée" },
                    ]
                  : [
                      { value: "draft", label: "Brouillon" },
                      { value: "published", label: "Publiée" },
                    ]
              }
            />
          </Card.Body>
        </Card>

        <Stack direction="row" gap={3} justify="end" wrap>
          <Link href={cancelHref}>
            <Button type="button" variant="ghost">
              Annuler
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={submitting || noOrg}
          >
            {mode === "create" ? "Créer l’action" : "Enregistrer les modifications"}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
