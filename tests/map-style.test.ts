import { describe, expect, it, vi } from "vitest";
import type { Map as MLMap } from "maplibre-gl";
import {
  enhancePlaceLabels,
  watchStyleFallback,
  MAP_STYLE_URL,
  RTL_PLUGIN_URL,
} from "@/lib/maplibre";

function fakeMap(layers: { id: string; maxzoom?: number }[], hasVectorSource = true) {
  const zoomRanges: Record<string, [number, number]> = {};
  const once = vi.fn();
  const map = {
    getStyle: () => ({ layers }),
    getSource: () => (hasVectorSource ? {} : undefined),
    setLayerZoomRange: (id: string, min: number, max: number) => {
      zoomRanges[id] = [min, max];
    },
    setStyle: vi.fn(),
    once,
    off: vi.fn(),
  };
  return { map: map as unknown as MLMap, zoomRanges, once };
}

describe("map style choice", () => {
  it("uses the vector style and the same-origin RTL plugin", () => {
    expect(MAP_STYLE_URL).toContain("openfreemap.org/styles");
    // Must be a classic same-origin script: the maplibre worker loads it with
    // importScripts(), which the production CSP only allows for 'self'.
    expect(RTL_PLUGIN_URL).toMatch(/^\/rtl-text\.js$/);
  });
});

describe("enhancePlaceLabels", () => {
  it("starts the POI tiers earlier than the style default", () => {
    const { map, zoomRanges } = fakeMap([
      { id: "poi_r1", maxzoom: 24 },
      { id: "poi_r7", maxzoom: 24 },
      { id: "poi_r20" },
      { id: "label_city", maxzoom: 24 },
    ]);

    enhancePlaceLabels(map);

    expect(zoomRanges.poi_r1[0]).toBeLessThan(15);
    expect(zoomRanges.poi_r7[0]).toBeLessThan(16);
    expect(zoomRanges.poi_r20).toEqual([15.5, 24]);
    // place/other layers keep the style's own zoom
    expect(zoomRanges.label_city).toBeUndefined();
  });

  it("is harmless on the raster fallback style", () => {
    const { map, zoomRanges } = fakeMap([{ id: "osm", type: "raster" } as never]);
    enhancePlaceLabels(map);
    expect(Object.keys(zoomRanges)).toHaveLength(0);
  });
});

describe("watchStyleFallback", () => {
  it("swaps to raster when the vector style never loads", () => {
    vi.useFakeTimers();
    const { map } = fakeMap([], false);
    watchStyleFallback(map, 5000);
    vi.advanceTimersByTime(5001);
    expect(map.setStyle).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("does nothing once the style is live", () => {
    vi.useFakeTimers();
    const { map } = fakeMap([], true);
    watchStyleFallback(map, 5000);
    vi.advanceTimersByTime(5001);
    expect(map.setStyle).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("is cancelled when the map unmounts first", () => {
    vi.useFakeTimers();
    const { map } = fakeMap([], false);
    const cancel = watchStyleFallback(map, 5000);
    cancel();
    vi.advanceTimersByTime(5001);
    expect(map.setStyle).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
