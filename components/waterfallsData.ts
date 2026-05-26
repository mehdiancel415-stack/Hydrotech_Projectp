export type Waterfall = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  height?: number;
  flow?: 'low' | 'medium' | 'high';
  access?: 'easy' | 'moderate' | 'difficult';
  region: string;
};

export type WaterfallWithScore = Waterfall & { score: number };

// ─── Liste curatée (données complètes : flow, access, region, height) ─────────
const CURATED: Waterfall[] = [
  // PYRÉNÉES
  { id: 1,  name: "Grande Cascade de Gavarnie",      lat: 42.7364, lng: 0.0197,   height: 422, flow: 'high',   access: 'easy',      region: "Pyrénées" },
  { id: 16, name: "Cascade d'Ars",                   lat: 42.8977, lng: 1.2343,   height: 200, flow: 'medium', access: 'difficult', region: "Ariège" },
  { id: 31, name: "Cascade du Cinca",                lat: 42.6917, lng: 0.0292,   height: 80,  flow: 'high',   access: 'moderate',  region: "Hautes-Pyrénées" },
  { id: 32, name: "Cascade de Lutour",               lat: 42.8469, lng: -0.1339,               flow: 'high',   access: 'easy',      region: "Hautes-Pyrénées" },
  { id: 33, name: "Cascade du Pont d'Espagne",       lat: 42.8703, lng: -0.1419,               flow: 'high',   access: 'easy',      region: "Hautes-Pyrénées" },
  { id: 34, name: "Cascade de la Pisse (Cauterets)", lat: 42.8717, lng: -0.1494,               flow: 'high',   access: 'moderate',  region: "Hautes-Pyrénées" },
  { id: 35, name: "Cascade de Sidonie",              lat: 42.7517, lng: -0.0219,               flow: 'medium', access: 'moderate',  region: "Hautes-Pyrénées" },
  // ALPES
  { id: 3,  name: "Cascade du Rouget",               lat: 45.9441, lng: 6.7328,   height: 70,  flow: 'high',   access: 'easy',      region: "Haute-Savoie" },
  { id: 11, name: "Cascade du Dard",                 lat: 45.8293, lng: 6.6103,   height: 40,  flow: 'high',   access: 'moderate',  region: "Savoie" },
  { id: 36, name: "Cascade d'Arpenaz",               lat: 46.0644, lng: 6.6264,   height: 270, flow: 'high',   access: 'easy',      region: "Haute-Savoie" },
  { id: 37, name: "Cascade de Sauffaz",              lat: 46.0444, lng: 6.7708,               flow: 'high',   access: 'moderate',  region: "Haute-Savoie" },
  { id: 38, name: "Cascade de la Pisse (Hautes-Alpes)", lat: 44.6694, lng: 6.4778,            flow: 'medium', access: 'moderate',  region: "Hautes-Alpes" },
  { id: 39, name: "Cascade de l'Oule",               lat: 44.5694, lng: 6.4231,               flow: 'medium', access: 'moderate',  region: "Hautes-Alpes" },
  { id: 40, name: "Cascade du Saut du Laire",        lat: 45.0233, lng: 5.7983,               flow: 'medium', access: 'moderate',  region: "Isère" },
  { id: 41, name: "Cascade de la Fare",              lat: 45.1056, lng: 6.0617,               flow: 'medium', access: 'easy',      region: "Isère" },
  { id: 19, name: "Cascade de Frémamorte",           lat: 44.0834, lng: 7.1612,   height: 80,  flow: 'medium', access: 'difficult', region: "Alpes-Maritimes" },
  { id: 57, name: "Cascade de Courmes",              lat: 43.7906, lng: 7.0028,   height: 40,  flow: 'medium', access: 'moderate',  region: "Alpes-Maritimes" },
  { id: 17, name: "Cascade de la Pissarotte",        lat: 44.9397, lng: 5.5131,   height: 25,  flow: 'medium', access: 'moderate',  region: "Vercors" },
  // JURA / DOUBS
  { id: 2,  name: "Cascade du Hérisson",             lat: 46.6287, lng: 5.8130,   height: 65,  flow: 'high',   access: 'easy',      region: "Jura" },
  { id: 5,  name: "Saut du Doubs",                   lat: 47.2572, lng: 6.7924,   height: 27,  flow: 'high',   access: 'easy',      region: "Doubs" },
  { id: 29, name: "Cascade de Baume-les-Messieurs",  lat: 46.6637, lng: 5.7892,   height: 60,  flow: 'medium', access: 'easy',      region: "Jura" },
  { id: 42, name: "Cascade du Hérisson - Grand Saut",lat: 46.6172, lng: 5.8606,   height: 60,  flow: 'high',   access: 'easy',      region: "Jura" },
  { id: 43, name: "Cascade des Tufs",                lat: 46.7264, lng: 5.6889,               flow: 'medium', access: 'easy',      region: "Jura" },
  { id: 44, name: "Cascade de la Billaude",          lat: 46.6753, lng: 5.8275,   height: 28,  flow: 'medium', access: 'easy',      region: "Jura" },
  { id: 45, name: "Cascade des Combes",              lat: 47.1239, lng: 6.7194,               flow: 'medium', access: 'easy',      region: "Doubs" },
  // VOSGES / ALSACE
  { id: 7,  name: "Cascade de Tendon",               lat: 48.0501, lng: 6.6978,   height: 28,  flow: 'medium', access: 'easy',      region: "Vosges" },
  { id: 20, name: "Cascade du Nideck",               lat: 48.5547, lng: 7.2703,   height: 25,  flow: 'medium', access: 'easy',      region: "Alsace" },
  { id: 21, name: "Cascade du Rummel",               lat: 48.0143, lng: 7.0521,   height: 20,  flow: 'medium', access: 'easy',      region: "Alsace" },
  { id: 46, name: "Cascade de Faymont",              lat: 47.9494, lng: 6.6661,               flow: 'medium', access: 'easy',      region: "Vosges" },
  { id: 47, name: "Cascade du Hohwald",              lat: 48.4014, lng: 7.3258,               flow: 'medium', access: 'easy',      region: "Bas-Rhin" },
  // MASSIF CENTRAL
  { id: 6,  name: "Cascade du Ray-Pic",              lat: 44.7406, lng: 4.1254,   height: 70,  flow: 'high',   access: 'moderate',  region: "Ardèche" },
  { id: 10, name: "Grande Cascade du Mont-Dore",     lat: 45.5757, lng: 2.8106,   height: 30,  flow: 'medium', access: 'easy',      region: "Auvergne" },
  { id: 12, name: "Cascade de la Beaume",            lat: 44.7814, lng: 3.9852,   height: 35,  flow: 'medium', access: 'easy',      region: "Ardèche" },
  { id: 15, name: "Cascade de Runes",                lat: 44.4383, lng: 3.6882,   height: 40,  flow: 'low',    access: 'moderate',  region: "Lozère" },
  { id: 48, name: "Cascade du Saillant",             lat: 45.3217, lng: 1.4625,               flow: 'medium', access: 'easy',      region: "Corrèze" },
  { id: 49, name: "Cascade des Vaux",                lat: 45.0358, lng: 2.7392,               flow: 'medium', access: 'moderate',  region: "Cantal" },
  { id: 50, name: "Cascade de Murel",                lat: 45.2253, lng: 1.7719,               flow: 'medium', access: 'moderate',  region: "Corrèze" },
  // AVEYRON / GARD
  { id: 4,  name: "Cascade de Salles-la-Source",     lat: 44.4348, lng: 2.5211,   height: 120, flow: 'medium', access: 'easy',      region: "Aveyron" },
  { id: 14, name: "Cascade du Sautadet",             lat: 44.3471, lng: 4.5162,   height: 15,  flow: 'high',   access: 'easy',      region: "Gard" },
  // PROVENCE / CÔTE D'AZUR
  { id: 18, name: "Gorges du Verdon",                lat: 43.8972, lng: 6.3283,               flow: 'high',   access: 'easy',      region: "Provence" },
  { id: 27, name: "Cascade du Baou de Théoule",      lat: 43.5093, lng: 6.9463,   height: 20,  flow: 'low',    access: 'moderate',  region: "Côte d'Azur" },
  { id: 56, name: "Cascade de Sillans",              lat: 43.5306, lng: 6.2050,   height: 42,  flow: 'medium', access: 'easy',      region: "Var" },
  { id: 58, name: "Cascade des Demoiselles",         lat: 43.9183, lng: 7.0672,               flow: 'medium', access: 'easy',      region: "Alpes-Maritimes" },
  // CORSE
  { id: 8,  name: "Cascade du Voile de la Mariée",   lat: 42.0648, lng: 9.2449,   height: 150, flow: 'medium', access: 'easy',      region: "Corse" },
  { id: 9,  name: "Cascade des Anglais",             lat: 42.1483, lng: 8.9167,   height: 30,  flow: 'medium', access: 'moderate',  region: "Corse" },
  { id: 51, name: "Cascade de Radule",               lat: 42.3081, lng: 8.9189,               flow: 'high',   access: 'moderate',  region: "Haute-Corse" },
  { id: 52, name: "Cascade de l'Aïtone",             lat: 42.2378, lng: 8.7394,               flow: 'medium', access: 'easy',      region: "Corse-du-Sud" },
  { id: 53, name: "Cascades de Purcaraccia",         lat: 41.7950, lng: 9.2972,               flow: 'high',   access: 'difficult', region: "Corse-du-Sud" },
  // NORMANDIE / BRETAGNE
  { id: 13, name: "Cascade de Mortain",              lat: 48.6207, lng: -0.9543,  height: 25,  flow: 'medium', access: 'easy',      region: "Normandie" },
  { id: 30, name: "Cascade du Huelgoat",             lat: 48.3616, lng: -3.7456,  height: 10,  flow: 'medium', access: 'easy',      region: "Bretagne" },
  { id: 54, name: "Cascade Saint-Herbot",            lat: 48.3550, lng: -3.8467,               flow: 'medium', access: 'easy',      region: "Finistère" },
  { id: 55, name: "Cascade du Stangala",             lat: 48.0244, lng: -4.0297,               flow: 'medium', access: 'moderate',  region: "Finistère" },
  { id: 59, name: "Cascade du Saut du Loup (Lot)",   lat: 44.7553, lng: 1.6722,               flow: 'medium', access: 'easy',      region: "Lot" },
  // SUISSE
  { id: 22, name: "Cascade de la Sarraz",            lat: 46.6758, lng: 6.3295,   height: 15,  flow: 'medium', access: 'easy',      region: "Vaud (CH)" },
  { id: 23, name: "Pissevache",                      lat: 46.1143, lng: 7.0251,   height: 114, flow: 'high',   access: 'easy',      region: "Valais (CH)" },
  { id: 24, name: "Cascade du Staubbach",            lat: 46.5937, lng: 7.9075,   height: 297, flow: 'medium', access: 'easy',      region: "Oberland (CH)" },
  { id: 25, name: "Trümmelbach",                     lat: 46.5726, lng: 7.9005,               flow: 'high',   access: 'easy',      region: "Oberland (CH)" },
  // AUTRICHE
  { id: 26, name: "Cascade de Liechtensteinklamm",   lat: 47.3541, lng: 13.1323,              flow: 'high',   access: 'easy',      region: "Autriche" },
  // TURQUIE
  { id: 28, name: "Cascade de l'Uçansu",             lat: 37.0467, lng: 30.6983,  height: 30,  flow: 'medium', access: 'moderate',  region: "Turquie" },
];

// ─── Enrichissement OSM : toutes les chutes nommées + celles avec hauteur ─────
type OsmEntry = { id: number; name: string; lat: number; lng: number; height?: number };

// Grille de déduplication : on ignore les coords à ±0.01° (~1km) des curatées
const _curatedGrid = new Set(
  CURATED.map((w) => `${(w.lat * 100) | 0},${(w.lng * 100) | 0}`)
);

function _guessRegion(lat: number, lng: number): string {
  if (lat > 51) return 'Europe du Nord';
  if (lat > 49) return 'Allemagne / Belgique';
  if (lat > 47 && lng > 9) return 'Autriche / Bavière';
  if (lat > 47 && lng > 6) return 'Suisse';
  if (lat > 47) return 'Nord-Est France';
  if (lat > 45 && lng > 6) return 'Alpes';
  if (lat > 45) return 'Centre-Est France';
  if (lat > 43 && lng > 7) return 'Italie';
  if (lat < 43.5 && lng < 3) return 'Pyrénées';
  if (lng < -1) return 'Bretagne / Normandie';
  if (lat < 44 && lng > 4) return 'Provence / Côte d\'Azur';
  return 'France';
}

const _osmRaw: OsmEntry[] = require('../assets/waterfalls-fr.json');

const OSM_WATERFALLS: Waterfall[] = _osmRaw
  .filter((w) => {
    const hasName = typeof w.name === 'string' && w.name.trim().length > 0;
    const hasHeight = typeof w.height === 'number' && w.height > 0;
    return hasName || hasHeight; // nommée OU avec hauteur connue
  })
  .filter((w) => {
    const key = `${(w.lat * 100) | 0},${(w.lng * 100) | 0}`;
    return !_curatedGrid.has(key); // pas déjà dans la liste curatée
  })
  .map((w) => ({
    id: w.id,
    name: (w.name && w.name.trim()) ? w.name.trim() : 'Cascade',
    lat: w.lat,
    lng: w.lng,
    height: w.height && w.height > 0 ? Math.round(w.height) : undefined,
    region: _guessRegion(w.lat, w.lng),
  }));

// ─── Liste finale combinée ────────────────────────────────────────────────────
export const ALL_WATERFALLS: Waterfall[] = [...CURATED, ...OSM_WATERFALLS];

// ─── Score 1–10 ───────────────────────────────────────────────────────────────
export function staticScore(w: Waterfall): number {
  let score = 3;
  if ((w.height ?? 0) >= 200) score += 3;
  else if ((w.height ?? 0) >= 80) score += 2;
  else if ((w.height ?? 0) >= 30) score += 1;
  if (w.flow === 'high') score += 3;
  else if (w.flow === 'medium') score += 1.5;
  if (w.access === 'easy') score += 1;
  else if (w.access === 'difficult') score -= 1;
  return Math.min(10, Math.max(1, Math.round(score)));
}

export function scoreColor(score: number): string {
  if (score >= 8) return '#16A34A'; // vert success
  if (score >= 6) return '#0EA5E9'; // cyan data (très visible sur carte)
  if (score >= 4) return '#2563C4'; // bleu accent
  return '#94A3B8';                 // gris doux
}

export function scoreLabel(score: number): string {
  if (score >= 8) return 'Top';
  if (score >= 6) return 'Bien';
  if (score >= 4) return 'Moyen';
  return 'Faible';
}

// ─── Météo / débit prévisionnel ───────────────────────────────────────────────
export async function fetchRiverForecast(
  lat: number,
  lng: number,
): Promise<{ rainLast7days: number; impact: string; label: string } | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      `&daily=precipitation_sum&past_days=7&forecast_days=0&timezone=auto`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const daily: number[] = data?.daily?.precipitation_sum ?? [];
    const total = daily.reduce((s: number, v: number) => s + (v ?? 0), 0);
    const impact = total > 40 ? 'increase' : total < 5 ? 'decrease' : 'normal';
    const label =
      impact === 'increase' ? 'Débit probable élevé' :
      impact === 'decrease' ? 'Débit probable faible' : 'Débit probable normal';
    return { rainLast7days: total, impact, label };
  } catch {
    return null;
  }
}
