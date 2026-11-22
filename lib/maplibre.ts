import type { Map as MLMap, StyleSpecification } from "maplibre-gl";

/**
 * Raster OSM keeps Arabic labels shaped correctly. The vector Liberty style
 * needs MapLibre's RTL plugin, and in the production bundle that plugin's
 * worker import fails, which drops every label. Raster tiles also show shops,
 * schools, hospitals, mosques and government buildings once the map is zoomed
 * to the neighborhood level.
 */
export const MAP_STYLE: StyleSpecification = {
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

export async function loadMapLibre() {
  return import("maplibre-gl");
}

export function createLocationPin() {
  const el = document.createElement("div");
  el.style.cssText = "width:32px;height:32px;cursor:pointer";
  el.innerHTML = `<span style="position:absolute;left:4px;top:4px;width:24px;height:24px;background:#be123c;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.28)"></span><span style="position:absolute;left:13px;top:13px;width:6px;height:6px;background:#fff;border-radius:50%"></span>`;
  return el;
}

export type MapInstance = MLMap;
