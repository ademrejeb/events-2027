import type { NextApiRequest, NextApiResponse } from "next";
import { enforceRateLimit } from "@/lib/rate-limit";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const CONTACT = process.env.NOMINATIM_CONTACT ?? "contact@yedlkhir.tn";

/**
 * Server-side place search (Nominatim).
 *
 * - Restricted to Tunisia and biased around the current map position.
 * - `accept-language` is forced to French + Arabic so labels never come back
 *   in a third language.
 * - Optional `type` appends a local keyword (école, hôpital, mairie…) so
 *   organisers can pick real buildings/POIs, not just street addresses.
 */
const PLACE_KEYWORDS: Record<string, string> = {
  school: "école",
  university: "université",
  hospital: "hôpital",
  health: "centre de santé",
  pharmacy: "pharmacie",
  mosque: "mosquée",
  municipality: "mairie",
  stadium: "stade",
  market: "marché",
  park: "parc",
  library: "bibliothèque",
  station: "gare",
};

const KIND_BY_TYPE: Record<string, string> = {
  school: "École",
  college: "Collège",
  university: "Université",
  kindergarten: "Jardin d'enfants",
  hospital: "Hôpital",
  clinic: "Clinique",
  doctors: "Cabinet médical",
  pharmacy: "Pharmacie",
  place_of_worship: "Lieu de culte",
  mosque: "Mosquée",
  townhall: "Mairie",
  city_hall: "Mairie",
  police: "Commissariat",
  fire_station: "Caserne",
  stadium: "Stade",
  sports_centre: "Salle de sport",
  pitch: "Terrain",
  swimming_pool: "Piscine",
  marketplace: "Marché",
  supermarket: "Supermarché",
  mall: "Centre commercial",
  park: "Parc",
  garden: "Jardin",
  playground: "Aire de jeux",
  library: "Bibliothèque",
  museum: "Musée",
  theatre: "Théâtre",
  cinema: "Cinéma",
  bus_station: "Gare routière",
  bus_stop: "Arrêt de bus",
  train_station: "Gare",
  hotel: "Hôtel",
  restaurant: "Restaurant",
  cafe: "Café",
  bank: "Banque",
  post_office: "Poste",
  government: "Bâtiment public",
  administrative: "Bâtiment administratif",
};

const KIND_BY_CLASS: Record<string, string> = {
  amenity: "Lieu public",
  building: "Bâtiment",
  leisure: "Loisir",
  tourism: "Tourisme",
  shop: "Commerce",
  office: "Bureau",
  highway: "Voie",
  railway: "Gare",
};

function clampCoord(value: unknown, min: number, max: number): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!enforceRateLimit(req, res, "geocode", 30, 60 * 1000)) return;

  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 120) : "";
  const type = typeof req.query.type === "string" ? req.query.type : "";
  const keyword = PLACE_KEYWORDS[type] ?? "";
  const search = [q, keyword].filter(Boolean).join(" ").trim();

  if (search.length < 2) {
    return res.status(400).json({
      error: "Saisissez un lieu ou choisissez un type de lieu.",
    });
  }

  const lat = clampCoord(req.query.lat, -90, 90);
  const lng = clampCoord(req.query.lng, -180, 180);

  const params = new URLSearchParams({
    q: search,
    format: "jsonv2",
    addressdetails: "1",
    limit: "8",
    countrycodes: "tn",
    "accept-language": "fr,ar",
    dedupe: "1",
  });

  if (lat !== null && lng !== null) {
    const delta = keyword ? 0.35 : 0.9;
    params.set(
      "viewbox",
      [lng - delta, lat + delta, lng + delta, lat - delta].join(","),
    );
    if (keyword) params.set("bounded", "1");
  }

  try {
    const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
      headers: {
        "User-Agent": `YedLkhir/1.0 (${CONTACT})`,
        "Accept-Language": "fr,ar",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Service de recherche indisponible." });
    }

    const data = (await response.json()) as Array<{
      display_name?: string;
      lat: string;
      lon: string;
      type?: string;
      class?: string;
    }>;

    const results = data
      .map((r) => {
        const latitude = Number(r.lat);
        const longitude = Number(r.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        return {
          display_name: (r.display_name ?? "").slice(0, 300),
          lat: latitude,
          lng: longitude,
          kind:
            (r.type && KIND_BY_TYPE[r.type]) ??
            (r.class && KIND_BY_CLASS[r.class]) ??
            "Lieu",
          category: r.class ?? r.type ?? "place",
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && !!r.display_name);

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ results });
  } catch {
    return res.status(500).json({ error: "Recherche de lieu impossible." });
  }
}
