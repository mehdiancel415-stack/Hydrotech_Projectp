// =============================================================
// STYLES DE CARTE — HYDROTECH (MapLibre)
// =============================================================
//
// 3 modes : Plan / Satellite / Hybride
// 4 fournisseurs (l'app détecte automatiquement le meilleur dispo) :
//
// 1. 🔥 MAPTILER — quasi-Google native, gratuit (100k/mois)
//    https://www.maptiler.com/cloud/ → API Keys → coller ci-dessous
//
// 2. 🔥 MAPBOX — excellent, gratuit (50k/mois)
//    https://account.mapbox.com/ → tokens → coller ci-dessous
//
// 3. 🟡 GOOGLE TILE TRICK — sans clé, qualité standard 256x256
//    Multi-subdomain mt0/mt1/mt2/mt3 pour load-balancing.
//
// 4. 🟡 ESRI — fallback ultime
//
// =============================================================

// 👇 COLLEZ VOTRE CLÉ MAPTILER POUR LA QUALITÉ HD
const MAPTILER_KEY = "";

// 👇 OU UNE CLÉ MAPBOX
const MAPBOX_TOKEN = "";

// =============================================================

const HAS_MAPTILER = MAPTILER_KEY.length > 0;
const HAS_MAPBOX = MAPBOX_TOKEN.length > 0;

function makeRasterStyle(urls: string[], attribution: string): any {
  return {
    version: 8 as const,
    sources: {
      tiles: {
        type: "raster" as const,
        tiles: urls,
        tileSize: 256,
        attribution,
        maxzoom: 19,
      },
    },
    layers: [{ id: "tiles", type: "raster" as const, source: "tiles" }],
  };
}

export const STYLE_STANDARD: any = HAS_MAPTILER
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : HAS_MAPBOX
  ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${MAPBOX_TOKEN}`
  : makeRasterStyle(
      [
        "https://mt0.google.com/vt/lyrs=m&hl=fr&x={x}&y={y}&z={z}",
        "https://mt1.google.com/vt/lyrs=m&hl=fr&x={x}&y={y}&z={z}",
        "https://mt2.google.com/vt/lyrs=m&hl=fr&x={x}&y={y}&z={z}",
        "https://mt3.google.com/vt/lyrs=m&hl=fr&x={x}&y={y}&z={z}",
      ],
      "© Google",
    );

export const STYLE_SATELLITE: any = HAS_MAPTILER
  ? `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`
  : HAS_MAPBOX
  ? `https://api.mapbox.com/styles/v1/mapbox/satellite-v9?access_token=${MAPBOX_TOKEN}`
  : makeRasterStyle(
      [
        "https://mt0.google.com/vt/lyrs=s&hl=fr&x={x}&y={y}&z={z}",
        "https://mt1.google.com/vt/lyrs=s&hl=fr&x={x}&y={y}&z={z}",
        "https://mt2.google.com/vt/lyrs=s&hl=fr&x={x}&y={y}&z={z}",
        "https://mt3.google.com/vt/lyrs=s&hl=fr&x={x}&y={y}&z={z}",
      ],
      "© Google",
    );

export const STYLE_HYBRID: any = HAS_MAPTILER
  ? `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`
  : HAS_MAPBOX
  ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12?access_token=${MAPBOX_TOKEN}`
  : makeRasterStyle(
      [
        "https://mt0.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}",
        "https://mt1.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}",
        "https://mt2.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}",
        "https://mt3.google.com/vt/lyrs=y&hl=fr&x={x}&y={y}&z={z}",
      ],
      "© Google",
    );

export type MapStyleId = "standard" | "satellite" | "hybrid";

export const MAP_STYLE_BY_ID: Record<MapStyleId, any> = {
  standard: STYLE_STANDARD,
  satellite: STYLE_SATELLITE,
  hybrid: STYLE_HYBRID,
};

export const NEXT_STYLE: Record<MapStyleId, MapStyleId> = {
  standard: "satellite",
  satellite: "hybrid",
  hybrid: "standard",
};

export const STYLE_LABEL: Record<MapStyleId, string> = {
  standard: "Plan",
  satellite: "Satellite",
  hybrid: "Hybride",
};

export const STYLE_ICON: Record<MapStyleId, string> = {
  standard: "🗺️",
  satellite: "🛰️",
  hybrid: "🌍",
};

export const PROVIDER_NAME = HAS_MAPTILER ? "MapTiler" : HAS_MAPBOX ? "Mapbox" : "Google";
