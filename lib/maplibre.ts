import type { Map as MLMap, StyleSpecification } from "maplibre-gl";

/**
 * Vector base map: OpenFreeMap "Liberty" (OpenMapTiles data, no API key, free
 * for production use). Vector labels are what makes the map informative:
 * countries, cities, towns and neighbourhood places - shops, schools,
 * hospitals, mosques, government buildings - come as real label layers with
 * icons, so they are readable from town zoom instead of only when you are
 * almost on top of them.
 */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/**
 * Arabic shaping / bidi for those label layers. MapLibre loads this file with
 * `importScripts()` inside its worker, so it has to stay a classic script: it
 * is the prebuilt 0.2.3 UMD (vendored in `public/`), which needs neither wasm
 * nor `unsafe-eval` - the newer ESM/wasm builds fail inside the worker and
 * silently drop every label.
 */
export const RTL_PLUGIN_URL = "/rtl-text.js";

/** Used when the vector tiles cannot be reached, so the map never stays blank. */
export const RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/** Where each POI importance tier starts showing, instead of the style default. */
const POI_ZOOM_START: Record<string, number> = {
  poi_r1: 13.5,
  poi_r7: 14.5,
  poi_r20: 15.5,
};

let rtlRequested = false;

export async function loadMapLibre() {
  // Browser-only code-splitting: maplibre-gl touches `window` at import time
  // and both maps mount with `ssr: false`, so a static import would break SSR
  // bundling and ship ~800 KB on every page.
  const ml = await import("maplibre-gl");
  if (!rtlRequested) {
    rtlRequested = true;
    // Fire and forget: labels are re-laid out once the plugin lands, so the
    // first paint does not wait on this request.
    void ml.setRTLTextPlugin(RTL_PLUGIN_URL, false).catch(() => {
      rtlRequested = false;
    });
  }
  return ml;
}

/** Pull neighbourhood places (mosques, schools, hospitals, shops) forward. */
export function enhancePlaceLabels(map: MLMap) {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    const minzoom = POI_ZOOM_START[layer.id];
    if (minzoom !== undefined) {
      map.setLayerZoomRange(layer.id, minzoom, layer.maxzoom ?? 24);
    }
  }
}

/**
 * Fall back to raster tiles if the vector style never loads (blocked CDN,
 * offline demo). Returns a cancel function for the caller's cleanup.
 */
export function watchStyleFallback(map: MLMap, timeoutMs = 7000): () => void {
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    if (!map.getSource("openmaptiles")) map.setStyle(RASTER_STYLE);
  }, timeoutMs);
  const onLoad = () => {
    settled = true;
    clearTimeout(timer);
  };
  map.once("load", onLoad);
  return () => {
    clearTimeout(timer);
    map.off("load", onLoad);
  };
}

export function createLocationPin() {
  const el = document.createElement("div");
  el.style.cssText = "width:32px;height:32px;cursor:pointer";
  el.innerHTML = `<span style="position:absolute;left:4px;top:4px;width:24px;height:24px;background:#be123c;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.28)"></span><span style="position:absolute;left:13px;top:13px;width:6px;height:6px;background:#fff;border-radius:50%"></span>`;
  return el;
}

export type MapInstance = MLMap;
