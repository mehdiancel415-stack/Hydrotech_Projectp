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

export const ALL_WATERFALLS: Waterfall[] = [
  { id: 1,  name: "Grande Cascade de Gavarnie",      lat: 42.7364, lng: 0.0197,  height: 422, flow: 'high',   access: 'easy',     region: "Pyrénées" },
  { id: 2,  name: "Cascade du Hérisson",             lat: 46.6287, lng: 5.8130,  height: 65,  flow: 'high',   access: 'easy',     region: "Jura" },
  { id: 3,  name: "Cascade du Rouget",               lat: 45.9441, lng: 6.7328,  height: 70,  flow: 'high',   access: 'easy',     region: "Haute-Savoie" },
  { id: 4,  name: "Cascade de Salles-la-Source",     lat: 44.4348, lng: 2.5211,  height: 120, flow: 'medium', access: 'easy',     region: "Aveyron" },
  { id: 5,  name: "Saut du Doubs",                   lat: 47.2572, lng: 6.7924,  height: 27,  flow: 'high',   access: 'easy',     region: "Doubs" },
  { id: 6,  name: "Cascade du Ray-Pic",              lat: 44.7406, lng: 4.1254,  height: 70,  flow: 'high',   access: 'moderate', region: "Ardèche" },
  { id: 7,  name: "Cascade de Tendon",               lat: 48.0501, lng: 6.6978,  height: 28,  flow: 'medium', access: 'easy',     region: "Vosges" },
  { id: 8,  name: "Cascade du Voile de la Mariée",   lat: 42.0648, lng: 9.2449,  height: 150, flow: 'medium', access: 'easy',     region: "Corse" },
  { id: 9,  name: "Cascade des Anglais",             lat: 42.1483, lng: 8.9167,  height: 30,  flow: 'medium', access: 'moderate', region: "Corse" },
  { id: 10, name: "Grande Cascade du Mont-Dore",     lat: 45.5757, lng: 2.8106,  height: 30,  flow: 'medium', access: 'easy',     region: "Auvergne" },
  { id: 11, name: "Cascade du Dard",                 lat: 45.8293, lng: 6.6103,  height: 40,  flow: 'high',   access: 'moderate', region: "Savoie" },
  { id: 12, name: "Cascade de la Beaume",            lat: 44.7814, lng: 3.9852,  height: 35,  flow: 'medium', access: 'easy',     region: "Ardèche" },
  { id: 13, name: "Cascade de Mortain",              lat: 48.6207, lng: -0.9543, height: 25,  flow: 'medium', access: 'easy',     region: "Normandie" },
  { id: 14, name: "Cascade du Sautadet",             lat: 44.3471, lng: 4.5162,  height: 15,  flow: 'high',   access: 'easy',     region: "Gard" },
  { id: 15, name: "Cascade de Runes",                lat: 44.4383, lng: 3.6882,  height: 40,  flow: 'low',    access: 'moderate', region: "Lozère" },
  { id: 16, name: "Cascade d'Ars",                   lat: 42.8977, lng: 1.2343,  height: 200, flow: 'medium', access: 'difficult',region: "Ariège" },
  { id: 17, name: "Cascade de la Pissarotte",        lat: 44.9397, lng: 5.5131,  height: 25,  flow: 'medium', access: 'moderate', region: "Vercors" },
  { id: 18, name: "Gorges du Verdon",                lat: 43.8972, lng: 6.3283,  height: 0,   flow: 'high',   access: 'easy',     region: "Provence" },
  { id: 19, name: "Cascade de Frémamorte",           lat: 44.0834, lng: 7.1612,  height: 80,  flow: 'medium', access: 'difficult',region: "Alpes-Maritimes" },
  { id: 20, name: "Cascade du Nideck",               lat: 48.5547, lng: 7.2703,  height: 25,  flow: 'medium', access: 'easy',     region: "Alsace" },
  { id: 21, name: "Cascade du Rummel",               lat: 48.0143, lng: 7.0521,  height: 20,  flow: 'medium', access: 'easy',     region: "Alsace" },
  { id: 22, name: "Cascade de la Sarraz",            lat: 46.6758, lng: 6.3295,  height: 15,  flow: 'medium', access: 'easy',     region: "Vaud (CH)" },
  { id: 23, name: "Pissevache",                      lat: 46.1143, lng: 7.0251,  height: 114, flow: 'high',   access: 'easy',     region: "Valais (CH)" },
  { id: 24, name: "Cascade du Staubbach",            lat: 46.5937, lng: 7.9075,  height: 297, flow: 'medium', access: 'easy',     region: "Oberland (CH)" },
  { id: 25, name: "Trümmelbach",                     lat: 46.5726, lng: 7.9005,  height: 0,   flow: 'high',   access: 'easy',     region: "Oberland (CH)" },
  { id: 26, name: "Cascade de Liechtensteinklamm",   lat: 47.3541, lng: 13.1323, height: 0,   flow: 'high',   access: 'easy',     region: "Autriche" },
  { id: 27, name: "Cascade du Baou de Théoule",      lat: 43.5093, lng: 6.9463,  height: 20,  flow: 'low',    access: 'moderate', region: "Côte d'Azur" },
  { id: 28, name: "Cascade de l'Uçansu",             lat: 37.0467, lng: 30.6983, height: 30,  flow: 'medium', access: 'moderate', region: "Turquie" },
  { id: 29, name: "Cascade de Baume-les-Messieurs",  lat: 46.6637, lng: 5.7892,  height: 60,  flow: 'medium', access: 'easy',     region: "Jura" },
  { id: 30, name: "Cascade du Huelgoat",             lat: 48.3616, lng: -3.7456, height: 10,  flow: 'medium', access: 'easy',     region: "Bretagne" },
];

// Score 1–10 basé sur hauteur, débit et accessibilité (= potentiel de production)
export function staticScore(w: Waterfall): number {
  let score = 3; // base

  // Hauteur : plus c'est haut, plus la pression est forte
  if ((w.height ?? 0) >= 200) score += 3;
  else if ((w.height ?? 0) >= 80) score += 2;
  else if ((w.height ?? 0) >= 30) score += 1;

  // Débit
  if (w.flow === 'high') score += 3;
  else if (w.flow === 'medium') score += 1.5;

  // Accessibilité (facile = on peut y accéder avec le matériel)
  if (w.access === 'easy') score += 1;
  else if (w.access === 'difficult') score -= 1;

  return Math.min(10, Math.max(1, Math.round(score)));
}

export function scoreColor(score: number): string {
  if (score >= 8) return '#10b981'; // vert
  if (score >= 6) return '#2dd4bf'; // teal
  if (score >= 4) return '#3b82f6'; // bleu
  return '#6b7280';                 // gris
}

export function scoreLabel(score: number): string {
  if (score >= 8) return 'Top';
  if (score >= 6) return 'Bien';
  if (score >= 4) return 'Moyen';
  return 'Faible';
}

// Prévision pluie 7 derniers jours via Open-Meteo (gratuit, no API key)
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
      impact === 'increase'
        ? 'Débit probable élevé'
        : impact === 'decrease'
        ? 'Débit probable faible'
        : 'Débit probable normal';
    return { rainLast7days: total, impact, label };
  } catch {
    return null;
  }
}
