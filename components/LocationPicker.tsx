import { useEffect, useRef, useState } from "react";
import type { Marker as MLMarker } from "maplibre-gl";
import {
  boostMapLabels,
  collapseAttribution,
  createLocationPin,
  loadMapLibre,
  MAP_STYLE,
} from "@/lib/maplibre";

type GeoResult = {
  display_name: string;
  lat: number;
  lng: number;
  kind?: string;
  category?: string;
};

const PLACE_TYPES = [
  { id: "", label: "Tous les lieux" },
  { id: "school", label: "Écoles" },
  { id: "university", label: "Universités" },
  { id: "hospital", label: "Hôpitaux" },
  { id: "health", label: "Centres de santé" },
  { id: "pharmacy", label: "Pharmacies" },
  { id: "mosque", label: "Mosquées" },
  { id: "municipality", label: "Mairies" },
  { id: "stadium", label: "Stades & salles" },
  { id: "market", label: "Marchés" },
  { id: "park", label: "Parcs & jardins" },
  { id: "library", label: "Bibliothèques" },
  { id: "station", label: "Transports" },
] as const;

type PlaceTypeId = (typeof PLACE_TYPES)[number]["id"];

export default function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<MLMarker | null>(null);
  const [ready, setReady] = useState(false);

  const [position, setPosition] = useState<[number, number] | null>(
    lat && lng ? [Number(lat), Number(lng)] : null,
  );
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [query, setQuery] = useState("");
  const [placeType, setPlaceType] = useState<PlaceTypeId>("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncedProps, setSyncedProps] = useState<[string, string]>([lat, lng]);
  const [skipNext, setSkipNext] = useState(false);

  const initialPosition = useRef(position);
  const pickRef = useRef<(lat: number, lng: number, fly?: boolean) => void>(
    () => {},
  );

  if (lat !== syncedProps[0] || lng !== syncedProps[1]) {
    setSyncedProps([lat, lng]);
    if (skipNext) {
      setSkipNext(false);
    } else if (lat && lng) {
      setPosition([Number(lat), Number(lng)]);
    }
  }

  function pick(la: number, ln: number, fly = false) {
    const next: [number, number] = [la, ln];
    setSkipNext(true);
    setPosition(next);
    if (fly) setFocus(next);
    onChange(String(la), String(ln));
  }

  useEffect(() => {
    pickRef.current = pick;
  });

  useEffect(() => {
    let cancelled = false;
    let map: import("maplibre-gl").Map | null = null;
    let marker: MLMarker | null = null;

    (async () => {
      const ml = await loadMapLibre();
      if (cancelled || !containerRef.current) return;

      const start = initialPosition.current;
      map = new ml.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: start ? [start[1], start[0]] : [10.1815, 36.8065],
        zoom: start ? 13 : 6,
        minZoom: 5,
        maxZoom: 18,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      mapRef.current = map;
      map.on("style.load", () => boostMapLabels(map!));
      collapseAttribution(map);
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-left");

      marker = new ml.Marker({
        element: createLocationPin(),
        anchor: "center",
        draggable: true,
      })
        .setLngLat(start ? [start[1], start[0]] : [10.1815, 36.8065])
        .addTo(map);
      marker.getElement().style.display = start ? "" : "none";
      markerRef.current = marker;

      marker.on("dragend", () => {
        const p = marker!.getLngLat();
        pickRef.current(p.lat, p.lng);
      });

      map.on("click", (e) => {
        pickRef.current(e.lngLat.lat, e.lngLat.lng);
      });

      map.on("load", () => {
        if (!cancelled) setReady(true);
      });
    })();

    return () => {
      cancelled = true;
      marker?.remove();
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const marker = markerRef.current;
    if (!ready || !marker) return;
    const el = marker.getElement();
    if (!position) {
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    marker.setLngLat([position[1], position[0]]);
  }, [ready, position]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focus) return;
    map.flyTo({ center: [focus[1], focus[0]], zoom: 15, duration: 800 });
  }, [ready, focus]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q && !placeType) {
      setNotice("Saisissez un nom ou choisissez un type de lieu.");
      return;
    }
    setSearching(true);
    setNotice(null);
    setResults([]);
    try {
      const params = new URLSearchParams({ q });
      if (placeType) params.set("type", placeType);
      if (position) {
        params.set("lat", String(position[0]));
        params.set("lng", String(position[1]));
      }
      const res = await fetch(`/api/geocode?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setNotice(data.error ?? "Recherche indisponible.");
      } else if (!data.results?.length) {
        setNotice("Aucun lieu trouvé. Essayez un autre terme ou une autre ville.");
      } else {
        setResults(data.results);
        setFocus([data.results[0].lat, data.results[0].lng]);
      }
    } catch {
      setNotice("Recherche indisponible.");
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setNotice("La géolocalisation n'est pas prise en charge.");
      return;
    }
    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pick(pos.coords.latitude, pos.coords.longitude, true);
        setLocating(false);
      },
      () => {
        setNotice("Position refusée. Sélectionnez un point sur la carte.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PLACE_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPlaceType(t.id)}
            aria-pressed={placeType === t.id}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
              (placeType === t.id
                ? "border-red-600 bg-red-600 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-red-200 hover:text-red-700")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <form onSubmit={search} className="flex gap-2">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="École, hôpital, adresse, quartier…"
              aria-label="Rechercher un lieu"
              className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {searching ? (
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.2-8.6" />
                </svg>
                Recherche
              </span>
            ) : (
              "Chercher"
            )}
          </button>
        </form>

        {results.length > 0 && (
          <ul className="absolute z-[600] mt-1 max-h-72 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
            {results.map((r, i) => (
              <li key={`${r.lat}-${r.lng}-${i}`}>
                <button
                  type="button"
                  onClick={() => {
                    pick(r.lat, r.lng, true);
                    setResults([]);
                    setQuery(r.display_name);
                    setNotice(null);
                  }}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-red-50"
                >
                  <span className="mt-0.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {r.kind ?? "Lieu"}
                  </span>
                  <span className="text-sm text-zinc-700">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-zinc-200" style={{ height: 320 }}>
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />

        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="absolute right-3 top-3 z-[800] flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-md backdrop-blur transition-colors hover:bg-white disabled:opacity-60"
        >
          <svg className={`h-3.5 w-3.5 ${locating ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 2v3m0 14v3m10-10h-3M5 12H2m13.5 0a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z" />
          </svg>
          {locating ? "Localisation…" : "Ma position"}
        </button>
      </div>

      {notice && <p className="text-xs font-medium text-amber-600">{notice}</p>}

      {position ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-green-600">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Coordonnées : {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Cliquez sur la carte, cherchez un lieu (école, hôpital, mairie…) ou utilisez
          votre position.
        </p>
      )}
    </div>
  );
}
