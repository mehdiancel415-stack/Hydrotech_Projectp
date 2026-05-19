/**
 * Chargement + scoring des chutes d'eau de France.
 *
 * - Le JSON `assets/waterfalls-fr.json` contient toutes les chutes
 *   (généré par `node scripts/fetch-waterfalls-fr.js`)
 * - Hydropower Score : score 0-100 basé sur hauteur OSM (si dispo)
 *   + facteur saisonnier (météo Open-Meteo si réseau)
 * - River Forecast : pluie 7 derniers jours via Open-Meteo
 */

import waterfallsRaw from "../assets/waterfalls-fr.json";

export type StaticWaterfall = {
  id: number;
  type: "waterfall";
  name: string;
  lat: number;
  lng: number;
  height?: number;
};

export type WaterfallWithScore = StaticWaterfall & {
  score: number; // 0-100
};

export const ALL_WATERFALLS: StaticWaterfall[] = waterfallsRaw as StaticWaterfall[];

/**
 * Score hydropower simplifié, basé uniquement sur les données OSM (offline).
 * - Hauteur 0-50m → score progressif 30-90
 * - Cascades sans hauteur → 50 (médiane)
 * Les chutes connues comme grandes (Gavarnie, Arpenaz...) ont déjà des hauteurs.
 */
export function staticScore(w: StaticWaterfall): number {
  if (w.height && w.height > 0) {
    // Score hauteur : 5m=40, 30m=70, 100m=85, 250m+=95
    const h = w.height;
    if (h >= 250) return 95;
    if (h >= 100) return 85;
    if (h >= 50) return 75;
    if (h >= 30) return 70;
    if (h >= 15) return 60;
    if (h >= 5) return 50;
    return 40;
  }
  return 50; // fallback
}

export function scoreColor(score: number): string {
  if (score >= 80) return "#34d399"; // success vert
  if (score >= 60) return "#2dd4bf"; // teal
  if (score >= 40) return "#fbbf24"; // warning orange
  return "#f87171"; // danger rouge
}

export function scoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Bon";
  if (score >= 40) return "Moyen";
  return "Faible";
}

/**
 * Filtre les chutes dans une bounding box (pour optimiser le rendu —
 * on n'affiche que celles visibles).
 */
export function waterfallsInBounds(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
): WaterfallWithScore[] {
  return ALL_WATERFALLS.filter(
    (w) =>
      w.lat >= bounds.minLat &&
      w.lat <= bounds.maxLat &&
      w.lng >= bounds.minLng &&
      w.lng <= bounds.maxLng,
  ).map((w) => ({ ...w, score: staticScore(w) }));
}

/**
 * Récupère la pluie cumulée des 7 derniers jours pour un point GPS.
 * Source : Open-Meteo (gratuit, sans clé).
 * Renvoie mm de pluie + estimation impact (string court).
 */
export async function fetchRiverForecast(
  lat: number,
  lng: number,
): Promise<{ rainLast7days: number; impact: "increase" | "stable" | "decrease"; label: string } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&past_days=7&hourly=precipitation&timezone=auto`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    const data = await res.json();
    const arr: number[] = data?.hourly?.precipitation || [];
    const rainLast7days = arr.reduce((s, v) => s + (v || 0), 0);
    let impact: "increase" | "stable" | "decrease" = "stable";
    let label = "Débit stable";
    if (rainLast7days > 30) {
      impact = "increase";
      label = "Débit en hausse (pluie récente)";
    } else if (rainLast7days < 5) {
      impact = "decrease";
      label = "Débit faible (peu de pluie)";
    }
    return { rainLast7days, impact, label };
  } catch (e) {
    return null;
  }
}
