/**
 * The 24 governorates of Tunisia, in the order used by the official
 * administrative list. City pickers select from this list only, so the same
 * place never enters the database under two spellings.
 */
export const TUNISIA_GOVERNORATES = [
  "Tunis",
  "Ariana",
  "Ben Arous",
  "Manouba",
  "Nabeul",
  "Zaghouan",
  "Bizerte",
  "Béja",
  "Jendouba",
  "Le Kef",
  "Siliana",
  "Sousse",
  "Monastir",
  "Mahdia",
  "Sfax",
  "Kairouan",
  "Kasserine",
  "Sidi Bouzid",
  "Gabès",
  "Médenine",
  "Tataouine",
  "Gafsa",
  "Tozeur",
  "Kébili",
] as const;

export type TunisiaGovernorate = (typeof TUNISIA_GOVERNORATES)[number];

/** Returns the canonical spelling for a stored value, or null. */
export function canonicalGovernorate(value: string | null | undefined): TunisiaGovernorate | null {
  if (!value) return null;
  const key = value.trim().toLocaleLowerCase("fr");
  return (
    TUNISIA_GOVERNORATES.find((gov) => gov.toLocaleLowerCase("fr") === key) ?? null
  );
}
