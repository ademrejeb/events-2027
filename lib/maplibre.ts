import type { Map as MLMap } from "maplibre-gl";

export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/**
 * The OFM Liberty style hides POIs until z15+ (rank 1), z16 (rank 7) and z17
 * (rank 20). That leaves neighborhood maps (z12–14) with no schools, hospitals,
 * government offices, mosques or shops — the exact context an event map needs.
 * Lower the thresholds so each class appears as soon as the map is detailed
 * enough to place it without clutter.
 */
const POI_ZOOMS: [string, number][] = [
  ["poi_r1", 12],
  ["poi_r7", 13],
  ["poi_r20", 14.5],
];

export function boostMapLabels(map: MLMap) {
  for (const [layerId, minzoom] of POI_ZOOMS) {
    if (!map.getLayer(layerId)) continue;
    try {
      map.setLayerZoomRange(layerId, minzoom, 24);
    } catch {
      /* style revision without this layer — keep the rest working */
    }
  }
}

export async function loadMapLibre() {
  // NOTE: do not register the RTL text plugin here. In the production bundle
  // the plugin's worker import fails and MapLibre then drops every symbol
  // layer (all place/road/POI labels) while keeping the vector geometry, which
  // left the maps unlabeled or blank. OFM tiles already carry `name:nonlatin`
  // for Arabic, so labels render fine without the plugin.
  return import("maplibre-gl");
}

export function collapseAttribution(map: MLMap) {
  const collapse = () => {
    const control = map
      .getContainer()
      .querySelector<HTMLElement>(".maplibregl-ctrl-attrib.maplibregl-compact");
    control?.classList.remove("maplibregl-compact-show");
  };
  collapse();
  requestAnimationFrame(collapse);
  map.once("load", collapse);
}

export function createLocationPin() {
  const el = document.createElement("div");
  el.style.cssText = "width:32px;height:32px;cursor:pointer";
  el.innerHTML = `<span style="position:absolute;left:4px;top:4px;width:24px;height:24px;background:#be123c;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.28)"></span><span style="position:absolute;left:13px;top:13px;width:6px;height:6px;background:#fff;border-radius:50%"></span>`;
  return el;
}

export type MapInstance = MLMap;
