import type { Map as MLMap } from "maplibre-gl";

export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

let rtlRegistered = false;

export async function loadMapLibre() {
  const mod = await import("maplibre-gl");
  if (!rtlRegistered) {
    rtlRegistered = true;
    mod.setRTLTextPlugin("/maplibre-gl-rtl-text.js", true).catch(() => {
      rtlRegistered = false;
    });
  }
  return mod;
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
