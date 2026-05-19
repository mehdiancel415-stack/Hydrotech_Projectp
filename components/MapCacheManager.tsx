import AsyncStorage from "@react-native-async-storage/async-storage";
import MapLibreGL from "@maplibre/maplibre-react-native";

const CACHE_KEY = "hydrotech_waterways_cache";
const TILE_PACK_NAME = "hydrotech-zone";

// URL du style utilisé pour le pack offline. Pour MapTiler/Mapbox, mets ta clé.
const STYLE_URL_FOR_OFFLINE =
  "https://tiles.openfreemap.org/styles/positron";

function buildQuery(lat: number, lng: number, radius: number): string {
  return `[out:json][timeout:15];(` +
    `way["waterway"~"river|stream|canal"](around:${radius},${lat},${lng});` +
    `way["waterway"="waterfall"](around:${radius},${lat},${lng});` +
    `node["waterway"="waterfall"](around:${radius},${lat},${lng});` +
    `node["natural"="waterfall"](around:${radius},${lat},${lng});` +
  `);out geom qt;`;
}

function parseElement(el: any): any | null {
  if (el.type === "node") {
    if (typeof el.lat !== "number" || typeof el.lon !== "number") return null;
    const pt = { latitude: el.lat, longitude: el.lon };
    return { id: el.id, type: el.tags?.waterway || el.tags?.natural || "waterfall", name: el.tags?.name ?? "", width: undefined, coords: [pt], midPoint: pt, isPoint: true };
  }
  if (el.geometry && el.geometry.length > 1) {
    const coords = el.geometry.map((g: any) => ({ latitude: g.lat, longitude: g.lon }));
    return { id: el.id, type: el.tags?.waterway ?? "stream", name: el.tags?.name ?? "", width: el.tags?.width ? parseFloat(el.tags.width) : undefined, coords, midPoint: coords[Math.floor(coords.length / 2)], isPoint: false };
  }
  return null;
}

export async function saveWaterwaysCache(key: string, ways: any[]) {
  try {
    const existing = await AsyncStorage.getItem(CACHE_KEY);
    const cache = existing ? JSON.parse(existing) : {};
    cache[key] = { ways, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

export async function getWaterwaysCache(key: string): Promise<any[] | null> {
  try {
    const existing = await AsyncStorage.getItem(CACHE_KEY);
    if (!existing) return null;
    const cache = JSON.parse(existing);
    if (cache[key]) {
      const age = Date.now() - cache[key].timestamp;
      if (age < 7 * 24 * 60 * 60 * 1000) return cache[key].ways;
    }
  } catch {}
  return null;
}

export async function preloadWaterways(lat: number, lng: number, onData: (ways: any[]) => void) {
  const key = `${Math.floor(lat / 0.08)}_${Math.floor(lng / 0.08)}`;
  const cached = await getWaterwaysCache(key);
  if (cached) { onData(cached); return; }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST", body: buildQuery(lat, lng, 15000), signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = await res.json();
    const ways = (data.elements || []).map(parseElement).filter((w: any) => w !== null);
    await saveWaterwaysCache(key, ways);
    onData(ways);
  } catch (e) { console.log("Preload error:", e); }
}

export type ZonePreloadResult = {
  ways: any[]; waterfalls: number; rivers: number; streams: number; tilesProcessed: number;
};

export async function preloadZoneWaterways(
  centerLat: number, centerLng: number,
  onProgress?: (done: number, total: number) => void,
): Promise<ZonePreloadResult> {
  const TILE = 0.08; const SPAN = 3;
  const tiles: { lat: number; lng: number }[] = [];
  for (let dx = -SPAN; dx <= SPAN; dx++) {
    for (let dy = -SPAN; dy <= SPAN; dy++) {
      tiles.push({ lat: centerLat + dx * TILE, lng: centerLng + dy * TILE });
    }
  }
  const allWays: any[] = []; const seenIds = new Set<number>();
  let done = 0;
  for (const t of tiles) {
    const key = `${Math.floor(t.lat / TILE)}_${Math.floor(t.lng / TILE)}`;
    const cached = await getWaterwaysCache(key);
    if (cached) {
      for (const w of cached) {
        if (!seenIds.has(w.id)) { seenIds.add(w.id); allWays.push(w); }
      }
    } else {
      try {
        const ctrl = new AbortController();
        const tm = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST", body: buildQuery(t.lat, t.lng, 8000), signal: ctrl.signal,
        });
        clearTimeout(tm);
        const data = await res.json();
        const ways = (data.elements || []).map(parseElement).filter((w: any) => w !== null);
        await saveWaterwaysCache(key, ways);
        for (const w of ways) {
          if (!seenIds.has(w.id)) { seenIds.add(w.id); allWays.push(w); }
        }
        await new Promise((r) => setTimeout(r, 1000));
      } catch (e) { console.log("Zone preload error on tile", t, e); }
    }
    done++; onProgress?.(done, tiles.length);
  }
  const waterfalls = allWays.filter((w) => w.type === "waterfall").length;
  const rivers = allWays.filter((w) => w.type === "river").length;
  const streams = allWays.filter((w) => w.type !== "waterfall" && w.type !== "river").length;
  return { ways: allWays, waterfalls, rivers, streams, tilesProcessed: tiles.length };
}

export async function downloadOfflineTiles(
  centerLat: number, centerLng: number,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const SPAN = 0.25;
  try {
    try { await MapLibreGL.OfflineManager.deletePack(TILE_PACK_NAME); } catch {}
    await MapLibreGL.OfflineManager.createPack(
      {
        name: TILE_PACK_NAME, styleURL: STYLE_URL_FOR_OFFLINE,
        bounds: [
          [centerLng - SPAN, centerLat - SPAN],
          [centerLng + SPAN, centerLat + SPAN],
        ],
        minZoom: 10, maxZoom: 16,
      },
      (pack: any, status: any) => {
        if (onProgress && typeof status?.percentage === "number") onProgress(status.percentage);
      },
      (pack: any, error: any) => { console.log("Offline pack error:", error); },
    );
  } catch (e) { console.log("downloadOfflineTiles error:", e); throw e; }
}

export async function deleteOfflineTiles(): Promise<void> {
  try { await MapLibreGL.OfflineManager.deletePack(TILE_PACK_NAME); } catch {}
}

export async function clearAllCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toDelete = keys.filter(
      (k) => k === CACHE_KEY || k.startsWith("waterways_") || k === "hydrotech_route_cache",
    );
    if (toDelete.length > 0) await AsyncStorage.multiRemove(toDelete);
    await deleteOfflineTiles();
  } catch (e) { console.log("clearAllCaches error:", e); }
}
