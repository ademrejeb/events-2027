import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MLMap, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import { loadMapLibre, enhancePlaceLabels, watchStyleFallback, MAP_STYLE_URL } from "@/lib/maplibre";
import { EVENT_CATEGORY_STYLES, FALLBACK_CATEGORY_STYLE, eventCategoryStyle } from "@/lib/event-style";

type MapEvent = {
  id: string;
  title: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  start_at: string;
  category_slug?: string | null;
  category_name?: string | null;
};

const SOURCE_ID = "yl-actions";
const POINT_LAYER = "yl-points";

function ensureCategoryImages(map: MLMap) {
  const styles = [...Object.values(EVENT_CATEGORY_STYLES), FALLBACK_CATEGORY_STYLE];
  for (const style of styles) {
    const imageId = `yl-cat-${style.slug}`;
    if (map.hasImage(imageId)) continue;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.clearRect(0, 0, 64, 64);
    ctx.beginPath();
    ctx.arc(32, 32, 27, 0, Math.PI * 2);
    ctx.fillStyle = style.color;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.save();
    ctx.translate(16, 16);
    ctx.scale(1.33, 1.33);
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    style.icon.forEach((path) => {
      const shape = new Path2D(path);
      ctx.stroke(shape);
    });
    ctx.restore();
    map.addImage(imageId, ctx.getImageData(0, 0, 64, 64), { pixelRatio: 2 });
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function buildPopup(ev: MapEvent) {
  const link = document.createElement("a");
  link.href = `/events/${ev.id}`;
  link.style.cssText =
    "display:block;max-width:220px;text-decoration:none;color:inherit";

  const category = eventCategoryStyle(ev.category_slug);
  if (ev.category_name) {
    const badge = document.createElement("span");
    badge.textContent = ev.category_name;
    badge.style.cssText = `display:inline-block;margin-bottom:4px;border-radius:999px;padding:2px 7px;font-size:10px;font-weight:600;color:${category.color};background:${category.soft}`;
    link.appendChild(badge);
  }

  const title = document.createElement("span");
  title.textContent = ev.title;
  title.style.cssText =
    "display:block;font-size:14px;font-weight:600;color:#18181b;line-height:1.35";
  link.appendChild(title);

  if (ev.city) {
    const city = document.createElement("span");
    city.textContent = ev.city;
    city.style.cssText =
      "display:block;margin-top:2px;font-size:12px;color:#71717a";
    link.appendChild(city);
  }

  const date = document.createElement("span");
  date.textContent = formatDate(ev.start_at);
  date.style.cssText =
    "display:block;margin-top:4px;font-size:12px;color:#a1a1aa";
  link.appendChild(date);

  return link;
}

export default function EventMap({
  events,
  center,
  height = "400px",
  ariaLabel = "Carte des actions solidaires",
}: {
  events: MapEvent[];
  center?: [number, number];
  height?: string;
  ariaLabel?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const libRef = useRef<Awaited<ReturnType<typeof loadMapLibre>> | null>(null);
  const [ready, setReady] = useState(false);

  const validEvents = useMemo(
    () => events.filter((e) => e.lat != null && e.lng != null),
    [events],
  );

  const points = useMemo(
    () => validEvents.map((e) => [e.lat!, e.lng!] as [number, number]),
    [validEvents],
  );

  const mapCenter: [number, number] =
    center ??
    (validEvents.length > 0
      ? [validEvents[0].lat!, validEvents[0].lng!]
      : [36.8065, 10.1815]);

  const initialView = useRef({
    lat: mapCenter[0],
    lng: mapCenter[1],
    zoom: center ? 16 : 6,
  });

  const centerLat = center?.[0];
  const centerLng = center?.[1];

  const legend = useMemo(() => {
    const seen = new Map<string, { label: string; color: string }>();
    validEvents.forEach((ev) => {
      const style = eventCategoryStyle(ev.category_slug);
      if (!seen.has(style.slug)) {
        seen.set(style.slug, { label: style.label, color: style.color });
      }
    });
    return Array.from(seen.values());
  }, [validEvents]);

  useEffect(() => {
    let cancelled = false;
    let map: MLMap | null = null;
    let cancelWatch: (() => void) | null = null;

    (async () => {
      const ml = await loadMapLibre();
      if (cancelled || !containerRef.current) return;
      libRef.current = ml;
      map = new ml.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: [initialView.current.lng, initialView.current.lat],
        zoom: initialView.current.zoom,
        minZoom: 5,
        maxZoom: 19,
        attributionControl: { compact: false },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-left");
      cancelWatch = watchStyleFallback(map);
      map.on("load", () => {
        if (cancelled || !map) return;
        enhancePlaceLabels(map);
        map.resize();
        setReady(true);
      });
    })();

    return () => {
      cancelled = true;
      cancelWatch?.();
      map?.remove();
      mapRef.current = null;
      libRef.current = null;
    };
  }, []);

  // MapLibre measures its container once. If the map mounts while the page is
  // still settling (fonts, dynamic chunk, responsive grid), that first
  // measurement can be 0×0 and the canvas stays collapsed until a refresh.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => mapRef.current?.resize());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const ml = libRef.current;
    if (!ready || !map || !ml) return;

    const data = {
      type: "FeatureCollection" as const,
      features: validEvents.map((ev) => {
        const style = eventCategoryStyle(ev.category_slug);
        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [ev.lng!, ev.lat!],
          },
          properties: {
            id: ev.id,
            title: ev.title,
            city: ev.city,
            start_at: ev.start_at,
            category_slug: style.slug,
            category_name: ev.category_name ?? style.label,
            color: style.color,
          },
        };
      }),
    };

    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
    } else {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data,
        cluster: false,
      });
      ensureCategoryImages(map);
      map.addLayer({
        id: POINT_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        layout: {
          "icon-image": ["concat", "yl-cat-", ["get", "category_slug"]],
          "icon-size": 0.7,
          "icon-allow-overlap": false,
          "icon-ignore-placement": false,
        },
      });
    }

    const popup = new ml.Popup({ offset: 14, closeButton: false });
    const canvas = map.getCanvas();

    const openEvent = (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const ev = validEvents.find((item) => item.id === feature.properties?.id);
      if (!ev) return;
      popup
        .setLngLat([ev.lng!, ev.lat!])
        .setDOMContent(buildPopup(ev))
        .addTo(map);
    };

    const setPointer = () => {
      canvas.style.cursor = "pointer";
    };
    const clearPointer = () => {
      canvas.style.cursor = "";
    };

    map.on("click", POINT_LAYER, openEvent);
    map.on("mouseenter", POINT_LAYER, setPointer);
    map.on("mouseleave", POINT_LAYER, clearPointer);

    return () => {
      map.off("click", POINT_LAYER, openEvent);
      map.off("mouseenter", POINT_LAYER, setPointer);
      map.off("mouseleave", POINT_LAYER, clearPointer);
      popup.remove();
    };
  }, [ready, validEvents]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || centerLat == null || centerLng == null) return;
    map.flyTo({ center: [centerLng, centerLat], zoom: 16, duration: 1100 });
  }, [ready, centerLat, centerLng]);

  useEffect(() => {
    const map = mapRef.current;
    const ml = libRef.current;
    if (!ready || !map || !ml || centerLat != null || points.length === 0) return;

    if (points.length === 1) {
      map.easeTo({ center: [points[0][1], points[0][0]], zoom: 16, duration: 600 });
      return;
    }

    const bounds = new ml.LngLatBounds();
    points.forEach(([lat, lng]) => bounds.extend([lng, lat]));
    map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 600 });
  }, [ready, points, centerLat, centerLng]);

  return (
    <div role="region" aria-label={ariaLabel}>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm">
        <div ref={containerRef} style={{ height, width: "100%" }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Légende des catégories">
        {legend.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-600"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
